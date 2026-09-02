import * as v from "valibot"
import type { Result } from "#result"
import { base64UrlDecode } from "../../shared/crypto/base64UrlDecode.js"
import { base64UrlEncode } from "../../shared/crypto/base64UrlEncode.js"
import { hkdfSha256Expand } from "../../shared/crypto/hkdfSha256Expand.js"
import { secureRandomBytes } from "../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import {
  type ExtensionBiometricEnrollment,
  extensionBiometricEnrollmentSchema,
} from "../storage/extensionBiometricEnrollmentSchema.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import { extensionStorageSchemaVersion } from "../storage/extensionStorageSchemaVersion.js"
import { extensionBiometricCapabilityRead } from "./extensionBiometricCapabilityRead.js"

type BiometricStorage = Pick<
  ReturnType<typeof extensionStorageCreate>,
  "biometricEnrollmentLoad" | "biometricEnrollmentSave" | "biometricEnrollmentClear"
>

type BiometricCredentialContainer = Pick<CredentialsContainer, "create" | "get">

type BiometricPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>
  getClientCapabilities?: () => Promise<unknown>
}

type BiometricAdapterOptions = {
  storage: BiometricStorage
  credentials?: BiometricCredentialContainer
  publicKeyCredential?: BiometricPublicKeyCredential
  rpId?: string
  origin?: string
  now?: () => number
}

type BiometricCredentialRecord = {
  getClientExtensionResults?: () => unknown
  rawId?: unknown
}

const biometricKeyInfo = new TextEncoder().encode("OneWarden biometric user-key wrapping v1")

function invalid<T>(op: string, errorMessage: string): Result<T> {
  return resultErrorCreate(op, errorMessage, { code: "platform.invalid-request", statusCode: 400 })
}

function unauthorized<T>(op: string, errorMessage: string): Result<T> {
  return resultErrorCreate(op, errorMessage, { code: "platform.unauthorized", statusCode: 401 })
}

function environmentRead(options: BiometricAdapterOptions, op: string): Result<{ rpId: string; origin: string }> {
  const rpId = options.rpId ?? globalThis.location?.hostname
  const origin = options.origin ?? globalThis.location?.origin
  if (typeof rpId !== "string" || rpId.length === 0 || rpId.trim() !== rpId)
    return invalid(op, "Biometric relying-party id is invalid.")
  if (typeof origin !== "string" || origin.length === 0) return invalid(op, "Biometric origin is invalid.")

  try {
    const parsedOrigin = new URL(origin)
    const extensionOrigin = parsedOrigin.protocol === "chrome-extension:" || parsedOrigin.protocol === "moz-extension:"
    if (
      (!extensionOrigin && parsedOrigin.origin !== origin) ||
      (extensionOrigin &&
        ((parsedOrigin.pathname !== "" && parsedOrigin.pathname !== "/") ||
          parsedOrigin.search.length > 0 ||
          parsedOrigin.hash.length > 0))
    )
      return invalid(op, "Biometric origin is invalid.")
  } catch {
    return invalid(op, "Biometric origin is invalid.")
  }
  return resultCreate({ rpId, origin })
}

function userIdRead(userId: unknown, op: string): Result<string> {
  const parsed = v.safeParse(v.pipe(v.string(), v.minLength(1), v.maxLength(128)), userId)
  if (!parsed.success) return invalid(op, "Biometric enrollment user id is invalid.")
  const userIdBytes = new TextEncoder().encode(parsed.output)
  if (userIdBytes.byteLength > 64) return invalid(op, "Biometric enrollment user id is too long.")
  return resultCreate(parsed.output)
}

function bytesCopy(value: unknown): Uint8Array<ArrayBuffer> | null {
  if (value instanceof ArrayBuffer) {
    const bytes = new Uint8Array(new ArrayBuffer(value.byteLength))
    bytes.set(new Uint8Array(value))
    return bytes
  }
  if (value instanceof Uint8Array) {
    const bytes = new Uint8Array(new ArrayBuffer(value.byteLength))
    bytes.set(value)
    return bytes
  }
  if (!ArrayBuffer.isView(value)) return null
  const view = value as ArrayBufferView
  const bytes = new Uint8Array(new ArrayBuffer(view.byteLength))
  bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
  return bytes
}

function credentialRecordRead(value: unknown, op: string): Result<BiometricCredentialRecord> {
  if (typeof value !== "object" || value === null) return invalid(op, "Biometric credential response is invalid.")
  const record = value as BiometricCredentialRecord
  if (typeof record.getClientExtensionResults !== "function")
    return invalid(op, "Biometric credential response is invalid.")
  return resultCreate(record)
}

function credentialRawIdMatches(credential: BiometricCredentialRecord, expected: Uint8Array, op: string): Result<void> {
  const rawId = bytesCopy(credential.rawId)
  if (rawId === null || rawId.byteLength !== expected.byteLength)
    return invalid(op, "Biometric credential id is invalid.")
  const matches = rawId.every((byte, index) => byte === expected[index])
  rawId.fill(0)
  if (!matches) return invalid(op, "Biometric credential id is invalid.")
  return resultCreate(undefined)
}

function credentialExtensionResultsRead(
  credential: BiometricCredentialRecord,
  requireEnabled: boolean,
  op: string,
): Result<Uint8Array | null> {
  let extensions: unknown
  try {
    extensions = credential.getClientExtensionResults?.()
  } catch {
    return invalid(op, "Biometric credential extensions are invalid.")
  }
  if (typeof extensions !== "object" || extensions === null)
    return invalid(op, "Biometric credential extensions are invalid.")
  const prf = (extensions as { prf?: unknown }).prf
  if (typeof prf !== "object" || prf === null) return invalid(op, "WebAuthn PRF is unavailable.")
  const prfRecord = prf as { enabled?: unknown; results?: unknown }
  if (requireEnabled && prfRecord.enabled !== true) return invalid(op, "WebAuthn PRF is unavailable.")
  if (requireEnabled) return resultCreate(null)
  if (typeof prfRecord.results !== "object" || prfRecord.results === null)
    return invalid(op, "WebAuthn PRF output is unavailable.")
  const first = (prfRecord.results as { first?: unknown }).first
  const bytes = bytesCopy(first)
  if (bytes === null || bytes.byteLength !== 32) return invalid(op, "WebAuthn PRF output is invalid.")
  return resultCreate(bytes)
}

function credentialOperationError<T>(op: string, error: unknown): Result<T> {
  const errorName = error instanceof Error ? error.name : ""
  if (errorName === "AbortError" || errorName === "NotAllowedError")
    return resultErrorCreate(op, "Biometric authentication was canceled.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  return resultErrorCreate(op, "Biometric authentication is unavailable.", {
    code: "platform.unavailable",
    statusCode: 503,
  })
}

async function capabilityEnsure(
  credentials: BiometricCredentialContainer | undefined,
  publicKeyCredential: BiometricPublicKeyCredential | undefined,
  op: string,
): Promise<Result<void>> {
  const capabilityResult = await extensionBiometricCapabilityRead({ credentials, publicKeyCredential })
  if (!capabilityResult.success) return capabilityResult
  if (capabilityResult.data.status === "available") return resultCreate(undefined)
  if (capabilityResult.data.status === "unavailable")
    return resultErrorCreate(op, "A platform biometric authenticator is unavailable.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  return resultErrorCreate(op, "Biometric unlock is unsupported by this platform.", {
    code: "extension.unsupported",
    statusCode: 400,
  })
}

async function wrappingKeyCreate(prfOutput: Uint8Array, op: string): Promise<Result<CryptoKey>> {
  const materialResult = await hkdfSha256Expand(prfOutput, biometricKeyInfo, 32)
  if (!materialResult.success) return materialResult
  try {
    return resultCreate(
      await crypto.subtle.importKey("raw", materialResult.data as Uint8Array<ArrayBuffer>, { name: "AES-GCM" }, false, [
        "decrypt",
        "encrypt",
      ]),
    )
  } catch {
    return resultErrorCreate(op, "Biometric wrapping key creation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  } finally {
    materialResult.data.fill(0)
  }
}

function additionalDataCreate(
  userId: string,
  credentialId: string,
  rpId: string,
  origin: string,
  salt: string,
): Uint8Array<ArrayBuffer> {
  const value = new TextEncoder().encode(
    `onewarden.biometric.v1\u0000${userId}\u0000${credentialId}\u0000${rpId}\u0000${origin}\u0000${salt}`,
  )
  return bytesCopy(value) as Uint8Array<ArrayBuffer>
}

async function userKeyWrap(
  userKey: Uint8Array,
  prfOutput: Uint8Array,
  userId: string,
  credentialId: string,
  rpId: string,
  origin: string,
  salt: string,
  op: string,
): Promise<Result<{ iv: string; ciphertext: string }>> {
  const wrappingKeyResult = await wrappingKeyCreate(prfOutput, op)
  if (!wrappingKeyResult.success) return wrappingKeyResult
  const ivResult = secureRandomBytes(12)
  if (!ivResult.success) return ivResult
  const iv = bytesCopy(ivResult.data) as Uint8Array<ArrayBuffer>
  const plaintext = bytesCopy(userKey) as Uint8Array<ArrayBuffer>
  const additionalData = additionalDataCreate(userId, credentialId, rpId, origin, salt)
  let ciphertextBytes: Uint8Array | null = null
  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 },
      wrappingKeyResult.data,
      plaintext,
    )
    ciphertextBytes = new Uint8Array(ciphertext)
    return resultCreate({ iv: base64UrlEncode(iv), ciphertext: base64UrlEncode(ciphertextBytes) })
  } catch {
    return resultErrorCreate(op, "Biometric user-key wrapping failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  } finally {
    iv.fill(0)
    plaintext.fill(0)
    ciphertextBytes?.fill(0)
  }
}

async function userKeyUnwrap(
  enrollment: ExtensionBiometricEnrollment,
  prfOutput: Uint8Array,
  op: string,
): Promise<Result<Uint8Array>> {
  const ivResult = base64UrlDecode(enrollment.iv)
  const ciphertextResult = base64UrlDecode(enrollment.ciphertext)
  if (
    !ivResult.success ||
    ivResult.data.byteLength !== 12 ||
    !ciphertextResult.success ||
    ciphertextResult.data.byteLength < 16
  )
    return unauthorized(op, "Biometric enrollment is invalid.")
  const wrappingKeyResult = await wrappingKeyCreate(prfOutput, op)
  if (!wrappingKeyResult.success) return wrappingKeyResult
  const iv = bytesCopy(ivResult.data) as Uint8Array<ArrayBuffer>
  const ciphertext = bytesCopy(ciphertextResult.data) as Uint8Array<ArrayBuffer>
  const additionalData = additionalDataCreate(
    enrollment.userId,
    enrollment.credentialId,
    enrollment.rpId,
    enrollment.origin,
    enrollment.salt,
  )
  let plaintext: Uint8Array | null = null
  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 },
      wrappingKeyResult.data,
      ciphertext,
    )
    plaintext = bytesCopy(plaintextBuffer) as Uint8Array<ArrayBuffer>
    if (plaintext.byteLength !== 64) return unauthorized(op, "Biometric user key is invalid.")
    return resultCreate(new Uint8Array(plaintext))
  } catch {
    return unauthorized(op, "Biometric enrollment could not be unwrapped.")
  } finally {
    iv.fill(0)
    ciphertext.fill(0)
    plaintext?.fill(0)
  }
}

export function extensionBiometricAdapterCreate(options: BiometricAdapterOptions) {
  const credentials = options.credentials ?? globalThis.navigator?.credentials
  const publicKeyCredential =
    options.publicKeyCredential ??
    (globalThis.PublicKeyCredential as unknown as BiometricPublicKeyCredential | undefined)
  const now = options.now ?? Date.now

  const capabilityRead = () => extensionBiometricCapabilityRead({ credentials, publicKeyCredential })

  const enroll = async (userId: string, userKey: Uint8Array): Promise<Result<ExtensionBiometricEnrollment>> => {
    const op = "extensionBiometric.enroll"
    const userIdResult = userIdRead(userId, op)
    if (!userIdResult.success) return userIdResult
    if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64)
      return invalid(op, "Bitwarden user key must be 64 bytes.")
    const environmentResult = environmentRead(options, op)
    if (!environmentResult.success) return environmentResult
    const capabilityResult = await capabilityEnsure(credentials, publicKeyCredential, op)
    if (!capabilityResult.success) return capabilityResult
    const enrollmentTime = now()
    if (!Number.isSafeInteger(enrollmentTime) || enrollmentTime < 0)
      return invalid(op, "Biometric enrollment time is invalid.")

    const challengeResult = secureRandomBytes(32)
    const saltResult = secureRandomBytes(32)
    if (!challengeResult.success) return challengeResult
    if (!saltResult.success) return saltResult
    const challenge = bytesCopy(challengeResult.data) as Uint8Array<ArrayBuffer>
    const salt = bytesCopy(saltResult.data) as Uint8Array<ArrayBuffer>
    const userIdBytes = new TextEncoder().encode(userIdResult.data)
    let credentialIdBytes: Uint8Array<ArrayBuffer> | null = null
    let prfOutput: Uint8Array | null = null
    try {
      let credentialValue: unknown
      try {
        credentialValue = await credentials?.create({
          publicKey: {
            challenge,
            rp: { id: environmentResult.data.rpId, name: "OneWarden" },
            user: { id: userIdBytes, name: userIdResult.data, displayName: "OneWarden biometric unlock" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
            attestation: "none",
            extensions: { prf: {} },
          } as unknown as PublicKeyCredentialCreationOptions,
        })
      } catch (error) {
        return credentialOperationError(op, error)
      }
      if (credentialValue === null || credentialValue === undefined)
        return credentialOperationError(op, new Error("No credential"))
      const credentialResult = credentialRecordRead(credentialValue, op)
      if (!credentialResult.success) return credentialResult
      const extensionResult = credentialExtensionResultsRead(credentialResult.data, true, op)
      if (!extensionResult.success) return extensionResult
      const rawId = bytesCopy(credentialResult.data.rawId)
      if (rawId === null || rawId.byteLength === 0) return invalid(op, "Biometric credential id is invalid.")
      credentialIdBytes = rawId
      const credentialId = base64UrlEncode(rawId)
      const saltText = base64UrlEncode(salt)

      let assertionValue: unknown
      try {
        assertionValue = await credentials?.get({
          publicKey: {
            challenge,
            rpId: environmentResult.data.rpId,
            userVerification: "required",
            allowCredentials: [{ type: "public-key", id: rawId, transports: ["internal"] }],
            extensions: { prf: { eval: { first: salt } } },
          } as unknown as PublicKeyCredentialRequestOptions,
        })
      } catch (error) {
        return credentialOperationError(op, error)
      }
      if (assertionValue === null || assertionValue === undefined)
        return credentialOperationError(op, new Error("No assertion"))
      const assertionResult = credentialRecordRead(assertionValue, op)
      if (!assertionResult.success) return assertionResult
      const assertionCredentialResult = credentialRawIdMatches(assertionResult.data, rawId, op)
      if (!assertionCredentialResult.success) return assertionCredentialResult
      const prfResult = credentialExtensionResultsRead(assertionResult.data, false, op)
      if (!prfResult.success) return prfResult
      if (prfResult.data === null) return invalid(op, "WebAuthn PRF output is unavailable.")
      prfOutput = prfResult.data
      const wrappedResult = await userKeyWrap(
        userKey,
        prfOutput,
        userIdResult.data,
        credentialId,
        environmentResult.data.rpId,
        environmentResult.data.origin,
        saltText,
        op,
      )
      if (!wrappedResult.success) return wrappedResult
      const timestamp = enrollmentTime
      const enrollment: ExtensionBiometricEnrollment = {
        userId: userIdResult.data,
        credentialId,
        rpId: environmentResult.data.rpId,
        origin: environmentResult.data.origin,
        salt: saltText,
        iv: wrappedResult.data.iv,
        ciphertext: wrappedResult.data.ciphertext,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      const saveResult = await options.storage.biometricEnrollmentSave(enrollment)
      if (!saveResult.success) return saveResult
      return resultCreate(enrollment)
    } finally {
      challenge.fill(0)
      salt.fill(0)
      userIdBytes.fill(0)
      credentialIdBytes?.fill(0)
      prfOutput?.fill(0)
    }
  }

  const unwrap = async (userId: string): Promise<Result<Uint8Array>> => {
    const op = "extensionBiometric.unwrap"
    const userIdResult = userIdRead(userId, op)
    if (!userIdResult.success) return userIdResult
    const environmentResult = environmentRead(options, op)
    if (!environmentResult.success) return environmentResult
    const capabilityResult = await capabilityEnsure(credentials, publicKeyCredential, op)
    if (!capabilityResult.success) return capabilityResult
    const enrollmentResult = await options.storage.biometricEnrollmentLoad(userIdResult.data)
    if (!enrollmentResult.success) return enrollmentResult
    if (enrollmentResult.data === null) return unauthorized(op, "Biometric enrollment was not found.")
    const parsedEnrollment = v.safeParse(extensionBiometricEnrollmentSchema, {
      schemaVersion: extensionStorageSchemaVersion,
      ...enrollmentResult.data,
    })
    if (!parsedEnrollment.success) return unauthorized(op, "Biometric enrollment is invalid.")
    const enrollment = parsedEnrollment.output
    if (enrollment.rpId !== environmentResult.data.rpId || enrollment.origin !== environmentResult.data.origin)
      return unauthorized(op, "Biometric enrollment belongs to another extension origin.")
    const credentialIdResult = base64UrlDecode(enrollment.credentialId)
    const saltResult = base64UrlDecode(enrollment.salt)
    if (
      !credentialIdResult.success ||
      credentialIdResult.data.byteLength === 0 ||
      !saltResult.success ||
      saltResult.data.byteLength !== 32
    )
      return unauthorized(op, "Biometric enrollment is invalid.")
    const challengeResult = secureRandomBytes(32)
    if (!challengeResult.success) return challengeResult
    const challenge = bytesCopy(challengeResult.data) as Uint8Array<ArrayBuffer>
    const credentialId = bytesCopy(credentialIdResult.data) as Uint8Array<ArrayBuffer>
    const salt = bytesCopy(saltResult.data) as Uint8Array<ArrayBuffer>
    let prfOutput: Uint8Array | null = null
    try {
      let assertionValue: unknown
      try {
        assertionValue = await credentials?.get({
          publicKey: {
            challenge,
            rpId: enrollment.rpId,
            userVerification: "required",
            allowCredentials: [{ type: "public-key", id: credentialId, transports: ["internal"] }],
            extensions: { prf: { eval: { first: salt } } },
          } as unknown as PublicKeyCredentialRequestOptions,
        })
      } catch (error) {
        return credentialOperationError(op, error)
      }
      if (assertionValue === null || assertionValue === undefined)
        return credentialOperationError(op, new Error("No assertion"))
      const assertionResult = credentialRecordRead(assertionValue, op)
      if (!assertionResult.success) return assertionResult
      const assertionCredentialResult = credentialRawIdMatches(assertionResult.data, credentialId, op)
      if (!assertionCredentialResult.success) return assertionCredentialResult
      const prfResult = credentialExtensionResultsRead(assertionResult.data, false, op)
      if (!prfResult.success) return prfResult
      if (prfResult.data === null) return unauthorized(op, "WebAuthn PRF output is unavailable.")
      prfOutput = prfResult.data
      return userKeyUnwrap(enrollment, prfOutput, op)
    } finally {
      challenge.fill(0)
      credentialId.fill(0)
      salt.fill(0)
      prfOutput?.fill(0)
    }
  }

  const revoke = (userId: string): Promise<Result<void>> => options.storage.biometricEnrollmentClear(userId)

  return { capabilityRead, enroll, unwrap, revoke }
}
