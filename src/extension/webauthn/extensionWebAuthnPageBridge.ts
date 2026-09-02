import * as v from "valibot"
import { extensionEnvironmentDefaultSource } from "../api/extensionEnvironmentDefaultSource.js"

const extensionWebAuthnSource = "onewarden-webauthn"
const extensionWebAuthnDefaultOrigin = new URL(extensionEnvironmentDefaultSource.base).origin
const extensionWebAuthnBridgeRequestType = "request"
const extensionWebAuthnBridgeResponseType = "response"
const extensionWebAuthnBridgeEnableType = "enable"
const extensionWebAuthnBridgeDisableType = "disable"
const extensionWebAuthnBridgeAbortType = "abort"
const extensionWebAuthnBridgeRequestTimeout = 120_000
const extensionWebAuthnDefaultTimeout = 60_000

type ExtensionWebAuthnPageContext = {
  window: Window
  navigator: Navigator
  location: Location
  document: Document
}

type ExtensionWebAuthnPageResult = { success: true; data: unknown } | { success: false; errorMessage: string }

type ExtensionWebAuthnOwnedPageMessage = {
  source: typeof extensionWebAuthnSource
  kind: string
  requestId?: string
  result?: ExtensionWebAuthnPageResult
  fallbackRequested?: boolean
}

type ExtensionWebAuthnPendingRequest = {
  signal: AbortSignal | null
  timeoutId: ReturnType<typeof setTimeout>
  abortListener: (() => void) | null
  resolve: (value: ExtensionWebAuthnPageResult | { fallbackRequested: true }) => void
  reject: (reason: unknown) => void
}

/** Installs the page-world WebAuthn wrapper after the isolated content script enables it. */
export function extensionWebAuthnPageBridgeInstall(
  context: ExtensionWebAuthnPageContext = globalThis as unknown as ExtensionWebAuthnPageContext,
): () => void {
  if (!extensionWebAuthnDocumentEligible(context) || context.location.origin === extensionWebAuthnDefaultOrigin) {
    return () => {}
  }

  const credentials = context.navigator.credentials
  if (credentials === undefined || credentials === null) return () => {}
  const originalCreate = credentials.create
  const originalGet = credentials.get
  const nativeCreate = credentials.create.bind(credentials)
  const nativeGet = credentials.get.bind(credentials)
  const pendingRequests = new Map<string, ExtensionWebAuthnPendingRequest>()
  let enabled = false
  let destroyed = false

  const messageListener = (event: MessageEvent<unknown>): void => {
    if (
      destroyed ||
      event.isTrusted === false ||
      event.source !== context.window ||
      event.origin !== context.location.origin
    )
      return
    if (!extensionWebAuthnPageMessageOwned(event.data)) return
    const message = event.data
    if (message.kind === extensionWebAuthnBridgeEnableType) {
      enabled = true
      credentials.create = createWebAuthnCredential
      credentials.get = getWebAuthnCredential
      return
    }
    if (message.kind === extensionWebAuthnBridgeDisableType) {
      extensionWebAuthnPageBridgeDestroy()
      return
    }
    if (message.kind !== extensionWebAuthnBridgeResponseType) return
    if (typeof message.requestId !== "string") return
    const pending = pendingRequests.get(message.requestId)
    if (pending === undefined) return
    pendingRequests.delete(message.requestId)
    clearTimeout(pending.timeoutId)
    if (pending.signal !== null && pending.abortListener !== null) {
      pending.signal.removeEventListener("abort", pending.abortListener)
    }
    if (message.fallbackRequested === true) {
      pending.resolve({ fallbackRequested: true })
      return
    }
    pending.resolve(message.result ?? { success: false, errorMessage: "The WebAuthn response is invalid." })
  }

  context.window.addEventListener("message", messageListener)

  function createWebAuthnCredential(options?: CredentialCreationOptions): Promise<Credential | null> {
    if (options === undefined || !enabled || !extensionWebAuthnCreateSupported(options)) return nativeCreate(options)
    let request: Record<string, unknown>
    try {
      request = extensionWebAuthnCreateRequestCreate(options)
    } catch {
      return nativeCreate(options)
    }
    return extensionWebAuthnRequestRun("create", request, options, nativeCreate)
  }

  function getWebAuthnCredential(options?: CredentialRequestOptions): Promise<Credential | null> {
    if (options === undefined || !enabled || !extensionWebAuthnGetSupported(options)) return nativeGet(options)
    let request: Record<string, unknown>
    try {
      request = extensionWebAuthnGetRequestCreate(options)
    } catch {
      return nativeGet(options)
    }
    return extensionWebAuthnRequestRun("get", request, options, nativeGet)
  }

  function extensionWebAuthnRequestRun<TOptions extends CredentialCreationOptions | CredentialRequestOptions>(
    operation: "create" | "get",
    request: Record<string, unknown>,
    options: TOptions,
    nativeRequest: (options?: TOptions) => Promise<Credential | null>,
  ): Promise<Credential | null> {
    const nativeFallbackSupported = extensionWebAuthnNativeFallbackSupported(operation)
    return extensionWebAuthnRequestSend(operation, request, options.signal ?? null, nativeFallbackSupported).then(
      async (result) => {
        if ("fallbackRequested" in result) {
          if (!nativeFallbackSupported) throw extensionWebAuthnNotAllowedError("WebAuthn is unavailable.")
          return nativeRequest(options)
        }
        if (!result.success) throw extensionWebAuthnNotAllowedError(result.errorMessage)
        return extensionWebAuthnCredentialCreate(operation, result.data)
      },
      (error: unknown) => {
        if (extensionWebAuthnBridgeUnavailable(error)) return nativeRequest(options)
        throw error
      },
    )
  }

  function extensionWebAuthnRequestSend(
    operation: "create" | "get",
    request: Record<string, unknown>,
    signal: AbortSignal | null,
    nativeFallbackSupported: boolean,
  ): Promise<ExtensionWebAuthnPageResult | { fallbackRequested: true }> {
    if (signal?.aborted === true) return Promise.reject(extensionWebAuthnAbortError())
    const requestId = extensionWebAuthnRequestIdCreate()
    const timeout = extensionWebAuthnRequestTimeoutRead(request.timeout)
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        extensionWebAuthnRequestAbort(requestId)
        const pending = pendingRequests.get(requestId)
        pendingRequests.delete(requestId)
        if (pending !== undefined && pending.signal !== null && pending.abortListener !== null) {
          pending.signal.removeEventListener("abort", pending.abortListener)
        }
        reject(extensionWebAuthnNotAllowedError("The WebAuthn operation timed out."))
      }, timeout)
      const abortListener =
        signal === null
          ? null
          : () => {
              extensionWebAuthnRequestAbort(requestId)
              pendingRequests.delete(requestId)
              clearTimeout(timeoutId)
              reject(extensionWebAuthnAbortError())
            }
      const pending: ExtensionWebAuthnPendingRequest = {
        signal,
        timeoutId,
        abortListener,
        resolve,
        reject,
      }
      pendingRequests.set(requestId, pending)
      if (signal !== null && abortListener !== null) signal.addEventListener("abort", abortListener, { once: true })
      try {
        context.window.postMessage(
          {
            source: extensionWebAuthnSource,
            kind: extensionWebAuthnBridgeRequestType,
            requestId,
            operation,
            request: { ...request, nativeFallbackSupported },
          },
          context.location.origin,
        )
      } catch {
        pendingRequests.delete(requestId)
        clearTimeout(timeoutId)
        if (signal !== null && abortListener !== null) signal.removeEventListener("abort", abortListener)
        reject(extensionWebAuthnUnavailableError())
      }
    })
  }

  function extensionWebAuthnRequestAbort(requestId: string): void {
    try {
      context.window.postMessage(
        { source: extensionWebAuthnSource, kind: extensionWebAuthnBridgeAbortType, requestId },
        context.location.origin,
      )
    } catch {
      // The request has already been terminated locally.
    }
  }

  function extensionWebAuthnPageBridgeDestroy(): void {
    if (destroyed) return
    destroyed = true
    enabled = false
    credentials.create = originalCreate
    credentials.get = originalGet
    context.window.removeEventListener("message", messageListener)
    for (const [requestId, pending] of pendingRequests) {
      extensionWebAuthnRequestAbort(requestId)
      clearTimeout(pending.timeoutId)
      if (pending.signal !== null && pending.abortListener !== null) {
        pending.signal.removeEventListener("abort", pending.abortListener)
      }
      pending.reject(extensionWebAuthnAbortError())
    }
    pendingRequests.clear()
  }

  return extensionWebAuthnPageBridgeDestroy

  function extensionWebAuthnPageMessageOwned(value: unknown): value is ExtensionWebAuthnOwnedPageMessage {
    const messageResult = v.safeParse(v.record(v.string(), v.unknown()), value)
    if (!messageResult.success) return false
    const message = messageResult.output
    return message.source === extensionWebAuthnSource && typeof message.kind === "string"
  }
}

function extensionWebAuthnDocumentEligible(context: ExtensionWebAuthnPageContext): boolean {
  if (context.document.contentType !== "text/html") return false
  if (context.location.protocol === "https:") return true
  return context.location.protocol === "http:" && context.location.hostname.toLowerCase() === "localhost"
}

function extensionWebAuthnCreateSupported(options: CredentialCreationOptions | undefined): boolean {
  if (options == null || options.publicKey == null) return false
  const publicKey = options.publicKey
  if (typeof publicKey !== "object") return false
  if (publicKey.authenticatorSelection?.authenticatorAttachment === "cross-platform") return false
  if (publicKey.attestation !== undefined && publicKey.attestation !== "none") return false
  if (publicKey.extensions !== undefined && Object.keys(publicKey.extensions).length > 0) return false
  if (
    publicKey.rp === undefined ||
    publicKey.user === undefined ||
    !Array.isArray(publicKey.pubKeyCredParams) ||
    publicKey.pubKeyCredParams.length === 0
  )
    return false
  if (publicKey.pubKeyCredParams.some((parameter) => parameter.type !== "public-key")) return false
  if (publicKey.pubKeyCredParams.some((parameter) => !Number.isSafeInteger(parameter.alg))) return false
  if (!publicKey.pubKeyCredParams.some((parameter) => parameter.type === "public-key" && parameter.alg === -7))
    return false
  return true
}

function extensionWebAuthnGetSupported(options: CredentialRequestOptions | undefined): boolean {
  if (options == null || options.publicKey == null) return false
  if (typeof options.publicKey !== "object") return false
  if (options.mediation === "conditional") return false
  if (options.publicKey.extensions !== undefined && Object.keys(options.publicKey.extensions).length > 0) return false
  if (options.publicKey.allowCredentials !== undefined && !Array.isArray(options.publicKey.allowCredentials))
    return false
  if (options.publicKey.allowCredentials?.some((credential) => credential.type !== "public-key")) return false
  return true
}

function extensionWebAuthnNativeFallbackSupported(operation: "create" | "get"): boolean {
  if (typeof PublicKeyCredential === "undefined") return false
  if (operation === "get") return true
  return typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
}

function extensionWebAuthnCreateRequestCreate(options: CredentialCreationOptions): Record<string, unknown> {
  const publicKey = options.publicKey
  if (publicKey === undefined) throw new Error("WebAuthn public-key options are missing.")
  return {
    challenge: extensionWebAuthnBufferEncode(publicKey.challenge),
    rpId: publicKey.rp.id ?? null,
    rpName: publicKey.rp.name,
    userId: extensionWebAuthnBufferEncode(publicKey.user.id),
    userName: publicKey.user.name,
    userDisplayName: publicKey.user.displayName,
    requireResidentKey: publicKey.authenticatorSelection?.requireResidentKey ?? false,
    residentKey: publicKey.authenticatorSelection?.residentKey ?? "discouraged",
    userVerification: publicKey.authenticatorSelection?.userVerification ?? "discouraged",
    excludeCredentialIds: (publicKey.excludeCredentials ?? []).map((credential) => {
      if (credential.type !== "public-key") throw new Error("WebAuthn credential type is unsupported.")
      return extensionWebAuthnBufferEncode(credential.id)
    }),
    pubKeyCredParams: publicKey.pubKeyCredParams.map((parameter) => ({
      type: parameter.type,
      alg: parameter.alg,
    })),
    timeout: extensionWebAuthnRequestTimeoutRead(publicKey.timeout),
  }
}

function extensionWebAuthnGetRequestCreate(options: CredentialRequestOptions): Record<string, unknown> {
  const publicKey = options.publicKey
  if (publicKey === undefined) throw new Error("WebAuthn public-key options are missing.")
  return {
    challenge: extensionWebAuthnBufferEncode(publicKey.challenge),
    rpId: publicKey.rpId ?? null,
    allowCredentialIds: (publicKey.allowCredentials ?? []).map((credential) => {
      if (credential.type !== "public-key") throw new Error("WebAuthn credential type is unsupported.")
      return extensionWebAuthnBufferEncode(credential.id)
    }),
    userVerification: publicKey.userVerification ?? "discouraged",
    mediation: options.mediation ?? "optional",
    timeout: extensionWebAuthnRequestTimeoutRead(publicKey.timeout),
  }
}

function extensionWebAuthnBufferEncode(value: BufferSource): string {
  const bytes = ArrayBuffer.isView(value)
    ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    : new Uint8Array(value)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

function extensionWebAuthnRequestIdCreate(): string {
  try {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID().replaceAll("-", "")
  } catch {
    // Use the monotonic fallback below.
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

function extensionWebAuthnRequestTimeoutRead(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return extensionWebAuthnDefaultTimeout
  return Math.min(Math.max(Math.ceil(value), 1), extensionWebAuthnBridgeRequestTimeout)
}

function extensionWebAuthnCredentialCreate(operation: "create" | "get", value: unknown): Credential {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const responseValueResult = v.safeParse(v.record(v.string(), v.unknown()), value)
  if (!responseValueResult.success) {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const responseValue = responseValueResult.output
  const response = responseValue.response
  if (
    typeof responseValue.id !== "string" ||
    typeof responseValue.rawId !== "string" ||
    responseValue.type !== "public-key" ||
    response === null ||
    typeof response !== "object" ||
    Array.isArray(response)
  ) {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const rawResponseResult = v.safeParse(v.record(v.string(), v.unknown()), response)
  if (!rawResponseResult.success) {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const rawResponse = rawResponseResult.output
  const id = responseValue.id
  const rawId = extensionWebAuthnBufferDecode(responseValue.rawId)
  const clientDataJSON = extensionWebAuthnBufferDecode(rawResponse.clientDataJSON)
  const authenticatorData = extensionWebAuthnBufferDecode(rawResponse.authenticatorData)
  const credentialResponse =
    operation === "create"
      ? extensionWebAuthnAttestationResponseCreate(rawResponse, clientDataJSON, authenticatorData)
      : extensionWebAuthnAssertionResponseCreate(rawResponse, clientDataJSON, authenticatorData)
  const credential = {
    id,
    rawId,
    type: "public-key",
    authenticatorAttachment: "platform",
    response: credentialResponse,
    getClientExtensionResults: () => ({}),
    toJSON: () => value,
  } as unknown as PublicKeyCredential
  const credentialPrototype = (globalThis as typeof globalThis & { PublicKeyCredential?: typeof PublicKeyCredential })
    .PublicKeyCredential?.prototype
  if (credentialPrototype !== undefined) Object.setPrototypeOf(credential, credentialPrototype)
  return credential
}

function extensionWebAuthnAttestationResponseCreate(
  response: Record<string, unknown>,
  clientDataJSON: ArrayBuffer,
  authenticatorData: ArrayBuffer,
): AuthenticatorAttestationResponse {
  if (
    typeof response.attestationObject !== "string" ||
    typeof response.publicKey !== "string" ||
    response.publicKeyAlgorithm !== -7 ||
    !Array.isArray(response.transports) ||
    !response.transports.every((transport): transport is string => typeof transport === "string")
  ) {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const transports = response.transports
  const attestationObject = extensionWebAuthnBufferDecode(response.attestationObject)
  const publicKey = extensionWebAuthnBufferDecode(response.publicKey)
  const result = {
    clientDataJSON,
    attestationObject,
    getAuthenticatorData: () => authenticatorData,
    getPublicKey: () => publicKey,
    getPublicKeyAlgorithm: () => -7,
    getTransports: () => transports,
  } as unknown as AuthenticatorAttestationResponse
  const responsePrototype = (
    globalThis as typeof globalThis & { AuthenticatorAttestationResponse?: typeof AuthenticatorAttestationResponse }
  ).AuthenticatorAttestationResponse?.prototype
  if (responsePrototype !== undefined) Object.setPrototypeOf(result, responsePrototype)
  return result
}

function extensionWebAuthnAssertionResponseCreate(
  response: Record<string, unknown>,
  clientDataJSON: ArrayBuffer,
  authenticatorData: ArrayBuffer,
): AuthenticatorAssertionResponse {
  if (typeof response.signature !== "string")
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  if (response.userHandle !== null && typeof response.userHandle !== "string")
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  const userHandle = response.userHandle === null ? null : extensionWebAuthnBufferDecode(response.userHandle)
  const result = {
    clientDataJSON,
    authenticatorData,
    signature: extensionWebAuthnBufferDecode(response.signature),
    userHandle,
  } as unknown as AuthenticatorAssertionResponse
  const responsePrototype = (
    globalThis as typeof globalThis & { AuthenticatorAssertionResponse?: typeof AuthenticatorAssertionResponse }
  ).AuthenticatorAssertionResponse?.prototype
  if (responsePrototype !== undefined) Object.setPrototypeOf(result, responsePrototype)
  return result
}

function extensionWebAuthnBufferDecode(value: unknown): ArrayBuffer {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  let decoded: string
  try {
    decoded = atob(`${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`)
  } catch {
    throw extensionWebAuthnNotAllowedError("The WebAuthn response is invalid.")
  }
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0))
  return bytes.buffer
}

function extensionWebAuthnNotAllowedError(message: string): DOMException {
  return new DOMException(message, "NotAllowedError")
}

function extensionWebAuthnAbortError(): DOMException {
  return new DOMException("The WebAuthn operation was aborted.", "AbortError")
}

function extensionWebAuthnUnavailableError(): Error {
  const error = new Error("OneWarden WebAuthn bridge is unavailable.")
  error.name = "OneWardenBridgeUnavailable"
  return error
}

function extensionWebAuthnBridgeUnavailable(error: unknown): boolean {
  return error instanceof Error && error.name === "OneWardenBridgeUnavailable"
}

if (typeof window !== "undefined") extensionWebAuthnPageBridgeInstall()
