import * as v from "valibot"
import { type Result } from "#result"
import { base64UrlEncode } from "../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionPasskeyAssertionResponseSchema } from "../passkey/extensionPasskeyAssertionResponseSchema.js"
import type { ExtensionPasskeyConsent } from "../passkey/extensionPasskeyConsentSchema.js"
import { extensionPasskeyRegistrationResponseSchema } from "../passkey/extensionPasskeyRegistrationResponseSchema.js"
import type { ExtensionPasskeyConsentContext } from "../passkey/extensionPasskeyConsentContextSchema.js"
import {
  extensionWebAuthnBridgeRequestSchema,
  type ExtensionWebAuthnBridgeRequest,
} from "./extensionWebAuthnBridgeRequestSchema.js"
import {
  type ExtensionWebAuthnBridgeResponse,
  extensionWebAuthnBridgeResponseSchema,
} from "./extensionWebAuthnBridgeResponseSchema.js"
import { extensionWebAuthnFramePolicyValidate } from "./extensionWebAuthnFramePolicyValidate.js"
import {
  extensionWebAuthnRequestContextResolve,
  type ExtensionWebAuthnRequestContext,
} from "./extensionWebAuthnRequestContextResolve.js"
import { extensionWebAuthnRpIdValidate } from "./extensionWebAuthnRpIdValidate.js"

const extensionWebAuthnDefaultOrigin = "https://onewarden.contentoren.de"
const extensionWebAuthnDefaultTimeout = 120_000

type ExtensionWebAuthnBackgroundService = {
  passkeyConsentContextCreate: (request: unknown) => Result<ExtensionPasskeyConsentContext>
  passkeyCredentialCreate: (request: unknown) => Promise<Result<unknown>>
  passkeyAssertion: (request: unknown) => Promise<Result<unknown>>
}

type ExtensionWebAuthnBackgroundRuntime = {
  onMessageAddListener: (
    listener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | undefined,
  ) => void
}

type ExtensionWebAuthnBackgroundBridgeOptions = {
  service: ExtensionWebAuthnBackgroundService
  runtime: ExtensionWebAuthnBackgroundRuntime
  initialize?: () => Promise<Result<void>>
  oneWardenOriginsRead?: () => Promise<readonly string[]>
  framePolicyAllows?: (context: ExtensionWebAuthnRequestContext, operation: "create" | "get") => Promise<boolean>
  consentResolve?: (
    context: ExtensionPasskeyConsentContext,
    requestContext: ExtensionWebAuthnRequestContext,
  ) => Promise<ExtensionPasskeyConsent | null>
  requestTimeoutMs?: number
}

type ExtensionWebAuthnActiveRequest = {
  controller: AbortController
  context: ExtensionWebAuthnRequestContext
}

/** Registers the trusted MessageSender WebAuthn bridge in the MV3 background worker. */
export function extensionWebAuthnBackgroundBridgeCreate(options: ExtensionWebAuthnBackgroundBridgeOptions) {
  const requestTimeoutMs = options.requestTimeoutMs ?? extensionWebAuthnDefaultTimeout
  const activeRequests = new Map<string, ExtensionWebAuthnActiveRequest>()

  const messageHandle = async (message: unknown, sender: unknown): Promise<ExtensionWebAuthnBridgeResponse | null> => {
    const requestId = extensionWebAuthnRequestIdRead(message)
    const parsed = v.safeParse(extensionWebAuthnBridgeRequestSchema, message)
    if (!parsed.success) {
      return requestId === null ? null : extensionWebAuthnErrorResponse(requestId, "WebAuthn request is invalid.")
    }
    if (parsed.output.type === "webauthnBridgeAbort") return abortRequest(parsed.output.requestId, sender)
    return requestHandle(parsed.output, sender)
  }

  const requestHandle = async (
    request: Exclude<ExtensionWebAuthnBridgeRequest, { type: "webauthnBridgeAbort" }>,
    sender: unknown,
  ): Promise<ExtensionWebAuthnBridgeResponse> => {
    const fallbackSupported = request.request.nativeFallbackSupported
    const fallback = (message: string): ExtensionWebAuthnBridgeResponse =>
      extensionWebAuthnErrorResponse(request.requestId, message, false, fallbackSupported)

    if (options.initialize !== undefined) {
      let initializeResult: Result<void>
      try {
        initializeResult = await options.initialize()
      } catch {
        return fallback("WebAuthn bridge initialization failed.")
      }
      if (!initializeResult.success) return fallback("WebAuthn bridge initialization failed.")
    }

    const contextResult = extensionWebAuthnRequestContextResolve(sender)
    if (!contextResult.success) return fallback("WebAuthn requesting context is not eligible.")
    const context = contextResult.data
    const framePolicyResult = extensionWebAuthnFramePolicyValidate(context.frameId, true)
    if (!framePolicyResult.success) return fallback(framePolicyResult.errorMessage)

    let excludedOrigins: readonly string[]
    try {
      excludedOrigins = await (options.oneWardenOriginsRead ?? extensionWebAuthnDefaultOriginsRead)()
    } catch {
      return fallback("WebAuthn requesting origin could not be verified.")
    }
    if (excludedOrigins.some((origin) => origin === context.origin))
      return fallback("WebAuthn is disabled for this origin.")

    let policyAllowed: boolean
    try {
      policyAllowed = await (options.framePolicyAllows ?? extensionWebAuthnFramePolicyAllows)(
        context,
        request.operation,
      )
    } catch {
      return fallback("WebAuthn requesting frame policy could not be verified.")
    }
    const policyResult = extensionWebAuthnFramePolicyValidate(context.frameId, policyAllowed)
    if (!policyResult.success) return fallback(policyResult.errorMessage)

    const rpIdResult = extensionWebAuthnRpIdValidate(request.request.rpId, context.hostname)
    if (!rpIdResult.success) return fallback(rpIdResult.errorMessage)

    if (request.operation === "create" && !request.request.pubKeyCredParams.some((parameter) => parameter.alg === -7)) {
      return fallback("The requested WebAuthn algorithms are unsupported.")
    }
    if (request.operation === "get" && request.request.mediation === "conditional") {
      return fallback("Conditional WebAuthn mediation is handled by the browser.")
    }

    const controller = new AbortController()
    const activeRequest: ExtensionWebAuthnActiveRequest = { controller, context }
    activeRequests.set(request.requestId, activeRequest)
    const operationPromise = requestPerform(request, context, rpIdResult.data, controller.signal)
    try {
      return await extensionWebAuthnRequestRace(
        request.requestId,
        operationPromise,
        controller,
        Math.min(request.request.timeout, Math.max(requestTimeoutMs, 1)),
      )
    } finally {
      activeRequests.delete(request.requestId)
    }
  }

  const abortRequest = async (requestId: string, sender: unknown): Promise<ExtensionWebAuthnBridgeResponse> => {
    const activeRequest = activeRequests.get(requestId)
    if (activeRequest === undefined) return extensionWebAuthnSuccessResponse(requestId, null)
    const contextResult = extensionWebAuthnRequestContextResolve(sender)
    if (
      !contextResult.success ||
      contextResult.data.tabId !== activeRequest.context.tabId ||
      contextResult.data.frameId !== activeRequest.context.frameId ||
      contextResult.data.origin !== activeRequest.context.origin
    ) {
      return extensionWebAuthnSuccessResponse(requestId, null)
    }
    activeRequest.controller.abort()
    return extensionWebAuthnSuccessResponse(requestId, null)
  }

  const runtimeMessageReceive = (
    message: unknown,
    sender: unknown,
    sendResponse: (response: unknown) => void,
  ): boolean | undefined => {
    if (!extensionWebAuthnBridgeMessageRecognized(message)) return undefined
    void messageHandle(message, sender).then(
      (response) => {
        if (response === null) return
        const parsed = v.safeParse(extensionWebAuthnBridgeResponseSchema, response)
        sendResponse(
          parsed.success ? response : extensionWebAuthnErrorResponse("invalid", "WebAuthn response is invalid."),
        )
      },
      () =>
        sendResponse(
          extensionWebAuthnErrorResponse(
            extensionWebAuthnRequestIdRead(message) ?? "invalid",
            "WebAuthn bridge failed.",
          ),
        ),
    )
    return true
  }

  options.runtime.onMessageAddListener(runtimeMessageReceive)

  return { messageHandle, runtimeMessageReceive }

  async function requestPerform(
    request: Exclude<ExtensionWebAuthnBridgeRequest, { type: "webauthnBridgeAbort" }>,
    context: ExtensionWebAuthnRequestContext,
    rpId: string,
    signal: AbortSignal,
  ): Promise<ExtensionWebAuthnBridgeResponse> {
    const clientDataJSONResult = clientDataJsonCreate(request.operation, request.request.challenge, context.origin)
    if (!clientDataJSONResult.success)
      return extensionWebAuthnErrorResponse(request.requestId, clientDataJSONResult.errorMessage)
    if (signal.aborted) return extensionWebAuthnAbortResponse(request.requestId)

    const serviceRequest =
      request.operation === "create"
        ? {
            rpId,
            rpName: request.request.rpName,
            userId: request.request.userId,
            userName: request.request.userName,
            userDisplayName: request.request.userDisplayName,
            clientDataJSON: clientDataJSONResult.data,
            requireResidentKey: request.request.requireResidentKey,
            residentKey: request.request.residentKey,
            userVerification: request.request.userVerification,
            excludeCredentialIds: request.request.excludeCredentialIds,
            cipherId: null,
          }
        : {
            rpId,
            clientDataJSON: clientDataJSONResult.data,
            allowCredentialIds: request.request.allowCredentialIds,
            credentialId: null,
            userHandle: null,
            userVerification: request.request.userVerification,
          }

    const contextResult = options.service.passkeyConsentContextCreate(serviceRequest)
    if (!contextResult.success) return extensionWebAuthnServiceErrorResponse(request.requestId, contextResult)
    if (signal.aborted) return extensionWebAuthnAbortResponse(request.requestId)

    if (options.consentResolve === undefined) {
      return extensionWebAuthnErrorResponse(
        request.requestId,
        "Passkey consent is not available.",
        true,
        request.request.nativeFallbackSupported,
      )
    }
    let consent: ExtensionPasskeyConsent | null
    try {
      consent = await options.consentResolve(contextResult.data, context)
    } catch {
      return extensionWebAuthnErrorResponse(request.requestId, "Passkey consent could not be completed.")
    }
    if (consent === null) return extensionWebAuthnErrorResponse(request.requestId, "Passkey operation was cancelled.")
    if (signal.aborted) return extensionWebAuthnAbortResponse(request.requestId)

    let operationResult: Result<unknown>
    try {
      operationResult =
        request.operation === "create"
          ? await options.service.passkeyCredentialCreate({ ...serviceRequest, consent })
          : await options.service.passkeyAssertion({ ...serviceRequest, consent })
    } catch {
      return extensionWebAuthnErrorResponse(request.requestId, "WebAuthn operation could not be completed.")
    }
    if (!operationResult.success) {
      if (operationResult.statusCode === 401) {
        return extensionWebAuthnErrorResponse(
          request.requestId,
          "WebAuthn is unavailable while the vault is locked.",
          true,
          request.request.nativeFallbackSupported,
        )
      }
      return extensionWebAuthnServiceErrorResponse(request.requestId, operationResult)
    }
    if (signal.aborted) return extensionWebAuthnAbortResponse(request.requestId)

    const responseSchema =
      request.operation === "create"
        ? extensionPasskeyRegistrationResponseSchema
        : extensionPasskeyAssertionResponseSchema
    const responseResult = v.safeParse(responseSchema, operationResult.data)
    if (!responseResult.success)
      return extensionWebAuthnErrorResponse(request.requestId, "WebAuthn response is invalid.")
    return extensionWebAuthnSuccessResponse(request.requestId, responseResult.output)
  }

  async function extensionWebAuthnRequestRace(
    requestId: string,
    operationPromise: Promise<ExtensionWebAuthnBridgeResponse>,
    controller: AbortController,
    timeout: number,
  ): Promise<ExtensionWebAuthnBridgeResponse> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let timedOut = false
    let resolveAbort: () => void = () => {}
    const abortListener = () => {
      if (!timedOut) resolveAbort()
    }
    const abortPromise = new Promise<ExtensionWebAuthnBridgeResponse>((resolve) => {
      resolveAbort = () => resolve(extensionWebAuthnAbortResponse(requestId))
    })
    const timeoutPromise = new Promise<ExtensionWebAuthnBridgeResponse>((resolve) => {
      timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
        resolve(extensionWebAuthnErrorResponse(requestId, "The WebAuthn operation timed out."))
      }, timeout)
    })
    controller.signal.addEventListener("abort", abortListener)
    try {
      return await Promise.race([operationPromise, abortPromise, timeoutPromise])
    } finally {
      controller.signal.removeEventListener("abort", abortListener)
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }

  function clientDataJsonCreate(operation: "create" | "get", challenge: string, origin: string): Result<string> {
    try {
      const clientDataJSON = JSON.stringify({ type: `webauthn.${operation}`, challenge, origin, crossOrigin: false })
      return resultCreate(base64UrlEncode(new TextEncoder().encode(clientDataJSON)))
    } catch {
      return resultErrorCreate(
        "extensionWebAuthnBackgroundBridge.clientDataJsonCreate",
        "WebAuthn client data is invalid.",
        {
          code: "platform.invalid-request",
          statusCode: 400,
        },
      )
    }
  }
}

function extensionWebAuthnBridgeMessageRecognized(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false
  const type = (value as Record<string, unknown>).type
  return type === "webauthnBridgeRequest" || type === "webauthnBridgeAbort"
}

function extensionWebAuthnRequestIdRead(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null
  const requestId = (value as Record<string, unknown>).requestId
  return typeof requestId === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(requestId) ? requestId : null
}

function extensionWebAuthnDefaultOriginsRead(): Promise<readonly string[]> {
  return Promise.resolve([extensionWebAuthnDefaultOrigin])
}

function extensionWebAuthnFramePolicyAllows(): Promise<boolean> {
  // The isolated content script performs the document policy check. The background
  // still enforces the trusted top-frame requirement, and callers may provide a
  // stricter policy resolver when header/ancestor state is available.
  return Promise.resolve(true)
}

function extensionWebAuthnSuccessResponse(requestId: string, data: unknown): ExtensionWebAuthnBridgeResponse {
  return { requestId, result: { success: true, data }, fallbackRequested: false }
}

function extensionWebAuthnErrorResponse(
  requestId: string,
  message: string,
  unavailable = false,
  fallbackRequested = false,
): ExtensionWebAuthnBridgeResponse {
  return {
    requestId,
    result: {
      success: false,
      op: "extensionWebAuthnBackgroundBridge",
      errorMessage: message,
      code: unavailable ? "platform.unavailable" : "platform.forbidden",
      statusCode: unavailable ? 503 : 403,
    },
    fallbackRequested,
  }
}

function extensionWebAuthnAbortResponse(requestId: string): ExtensionWebAuthnBridgeResponse {
  return extensionWebAuthnErrorResponse(requestId, "The WebAuthn operation was aborted.")
}

function extensionWebAuthnServiceErrorResponse(
  requestId: string,
  _error: { errorMessage: string },
): ExtensionWebAuthnBridgeResponse {
  return extensionWebAuthnErrorResponse(requestId, "WebAuthn operation could not be completed.")
}
