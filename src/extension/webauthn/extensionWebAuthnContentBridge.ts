import * as v from "valibot"
import { extensionEnvironmentResolve } from "../api/extensionEnvironmentResolve.js"
import { extensionEnvironmentStorageSchema } from "../storage/extensionEnvironmentStorageSchema.js"
import { extensionStorageKeys } from "../storage/extensionStorageKeys.js"
import {
  extensionWebAuthnBridgeRequestSchema,
  type ExtensionWebAuthnBridgeRequest,
} from "./extensionWebAuthnBridgeRequestSchema.js"
import { extensionWebAuthnBridgeResponseSchema } from "./extensionWebAuthnBridgeResponseSchema.js"
import { extensionWebAuthnFramePolicyValidate } from "./extensionWebAuthnFramePolicyValidate.js"
import { extensionWebAuthnOriginValidate } from "./extensionWebAuthnOriginValidate.js"
import {
  extensionWebAuthnPageMessageSchema,
  type ExtensionWebAuthnPageMessage,
} from "./extensionWebAuthnPageMessageSchema.js"

const extensionWebAuthnSource = "onewarden-webauthn"
const extensionWebAuthnDefaultOrigin = "https://onewarden.contentoren.de"

type ExtensionWebAuthnContentContext = {
  window: Window
  document: Document
  location: Location
  runtime: { sendMessage: (message: unknown) => Promise<unknown> }
  excludedOriginsRead: () => Promise<readonly string[] | null>
}

/** Installs the isolated-world half of the WebAuthn bridge after checking the configured vault origin. */
export async function extensionWebAuthnContentBridgeInstall(
  context: ExtensionWebAuthnContentContext = extensionWebAuthnContentContextCreate(),
): Promise<() => void> {
  const originResult = extensionWebAuthnOriginValidate(context.location.href)
  if (!originResult.success || context.document.contentType !== "text/html") return () => {}

  let excludedOrigins: readonly string[] | null
  try {
    excludedOrigins = await context.excludedOriginsRead()
  } catch {
    excludedOrigins = null
  }
  if (excludedOrigins === null || excludedOrigins.some((origin) => origin === originResult.data.origin)) return () => {}

  const pendingRequestIds = new Set<string>()
  let destroyed = false

  const messageListener = (event: MessageEvent<unknown>): void => {
    if (
      destroyed ||
      event.isTrusted === false ||
      event.source !== context.window ||
      event.origin !== originResult.data.origin
    )
      return
    const pageMessageResult = v.safeParse(extensionWebAuthnPageMessageSchema, event.data)
    if (!pageMessageResult.success) return
    const pageMessage = pageMessageResult.output
    if (pageMessage.kind === "enable" || pageMessage.kind === "disable") return
    if (pageMessage.kind === "abort") {
      pendingRequestIds.delete(pageMessage.requestId)
      void context.runtime
        .sendMessage({ type: "webauthnBridgeAbort", requestId: pageMessage.requestId })
        .catch(() => {})
      return
    }
    if (pageMessage.kind !== "request") return
    const requestMessage = pageMessage as Extract<ExtensionWebAuthnPageMessage, { kind: "request" }>

    const requestResult = v.safeParse(extensionWebAuthnBridgeRequestSchema, {
      type: "webauthnBridgeRequest",
      requestId: requestMessage.requestId,
      operation: requestMessage.operation,
      request: requestMessage.request,
    })
    if (!requestResult.success) {
      extensionWebAuthnPageResponsePost(context, originResult.data.origin, requestMessage.requestId, {
        success: false,
        op: "extensionWebAuthnContentBridge",
        errorMessage: "WebAuthn request is invalid.",
        code: "platform.invalid-request",
        statusCode: 400,
      })
      return
    }
    const request = requestResult.output as Exclude<ExtensionWebAuthnBridgeRequest, { type: "webauthnBridgeAbort" }>
    if (!extensionWebAuthnContentPolicyAllows(context.document, request.operation)) {
      extensionWebAuthnPageResponsePost(
        context,
        originResult.data.origin,
        request.requestId,
        {
          success: false,
          op: "extensionWebAuthnContentBridge",
          errorMessage: "WebAuthn is not enabled by this document's Permissions Policy.",
          code: "platform.forbidden",
          statusCode: 403,
        },
        request.request.nativeFallbackSupported,
      )
      return
    }

    pendingRequestIds.add(request.requestId)
    void extensionWebAuthnRuntimeRequestSend(context, originResult.data.origin, request, pendingRequestIds)
  }

  context.window.addEventListener("message", messageListener)
  context.window.postMessage({ source: extensionWebAuthnSource, kind: "enable" }, originResult.data.origin)

  return () => {
    if (destroyed) return
    destroyed = true
    pendingRequestIds.clear()
    context.window.removeEventListener("message", messageListener)
    try {
      context.window.postMessage({ source: extensionWebAuthnSource, kind: "disable" }, originResult.data.origin)
    } catch {
      // The document is already going away.
    }
  }
}

function extensionWebAuthnContentContextCreate(): ExtensionWebAuthnContentContext {
  const extensionChrome = (
    globalThis as typeof globalThis & {
      chrome?: {
        runtime?: { sendMessage: (message: unknown) => Promise<unknown> }
        storage?: { local?: { get: (keys: string) => Promise<Record<string, unknown>> } }
      }
    }
  ).chrome
  return {
    window: globalThis as unknown as Window,
    document,
    location,
    runtime: extensionChrome?.runtime ?? { sendMessage: async () => undefined },
    excludedOriginsRead: () => extensionWebAuthnExcludedOriginsRead(extensionChrome?.storage?.local),
  }
}

async function extensionWebAuthnExcludedOriginsRead(
  storage: { get: (keys: string) => Promise<Record<string, unknown>> } | undefined,
): Promise<readonly string[] | null> {
  if (storage === undefined) return [extensionWebAuthnDefaultOrigin]
  const values = await storage.get(extensionStorageKeys.environmentSettings)
  const storedValue = values[extensionStorageKeys.environmentSettings]
  if (storedValue === undefined) return [extensionWebAuthnDefaultOrigin]
  const parsed = v.safeParse(extensionEnvironmentStorageSchema, storedValue)
  if (!parsed.success) return null
  const environmentResult = extensionEnvironmentResolve(parsed.output.source)
  if (!environmentResult.success) return null
  return [extensionWebAuthnDefaultOrigin, new URL(environmentResult.data.webVault).origin]
}

function extensionWebAuthnContentPolicyAllows(documentValue: Document, operation: "create" | "get"): boolean {
  const feature = operation === "create" ? "publickey-credentials-create" : "publickey-credentials-get"
  const policyHolder = documentValue as Document & {
    permissionsPolicy?: { allowsFeature: (featureName: string) => boolean }
    featurePolicy?: { allowsFeature: (featureName: string) => boolean }
  }
  const policy = policyHolder.permissionsPolicy ?? policyHolder.featurePolicy
  if (policy === undefined) return false
  try {
    return extensionWebAuthnFramePolicyValidate(0, policy.allowsFeature(feature)).success
  } catch {
    return false
  }
}

async function extensionWebAuthnRuntimeRequestSend(
  context: ExtensionWebAuthnContentContext,
  origin: string,
  request: Exclude<ExtensionWebAuthnBridgeRequest, { type: "webauthnBridgeAbort" }>,
  pendingRequestIds: Set<string>,
): Promise<void> {
  let response: unknown
  try {
    response = await context.runtime.sendMessage(request)
  } catch {
    if (pendingRequestIds.delete(request.requestId)) {
      extensionWebAuthnPageResponsePost(
        context,
        origin,
        request.requestId,
        {
          success: false,
          op: "extensionWebAuthnContentBridge",
          errorMessage: "WebAuthn bridge is unavailable.",
          code: "platform.unavailable",
          statusCode: 503,
        },
        request.request.nativeFallbackSupported,
      )
    }
    return
  }

  if (!pendingRequestIds.delete(request.requestId)) return
  const parsed = v.safeParse(extensionWebAuthnBridgeResponseSchema, response)
  if (!parsed.success || parsed.output.requestId !== request.requestId) {
    extensionWebAuthnPageResponsePost(
      context,
      origin,
      request.requestId,
      {
        success: false,
        op: "extensionWebAuthnContentBridge",
        errorMessage: "WebAuthn bridge returned an invalid response.",
        code: "platform.internal",
        statusCode: 500,
      },
      request.request.nativeFallbackSupported,
    )
    return
  }
  extensionWebAuthnPageResponsePost(
    context,
    origin,
    request.requestId,
    parsed.output.result,
    parsed.output.fallbackRequested,
  )
}

function extensionWebAuthnPageResponsePost(
  context: ExtensionWebAuthnContentContext,
  origin: string,
  requestId: string,
  result: {
    success: boolean
    data?: unknown
    op?: string
    errorMessage?: string
    code?: string
    statusCode?: number
  },
  fallbackRequested = false,
): void {
  try {
    context.window.postMessage(
      {
        source: extensionWebAuthnSource,
        kind: "response",
        requestId,
        result,
        ...(fallbackRequested ? { fallbackRequested: true } : {}),
      },
      origin,
    )
  } catch {
    // The page may have navigated away.
  }
}

if (typeof window !== "undefined") void extensionWebAuthnContentBridgeInstall().catch(() => {})
