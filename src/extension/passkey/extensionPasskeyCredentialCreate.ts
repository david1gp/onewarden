import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenFido2Credential } from "../../shared/api/bitwardenFido2CredentialSchema.js"
import { base64UrlDecode } from "../../shared/crypto/base64UrlDecode.js"
import { base64UrlEncode } from "../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionCborEncode } from "./extensionCborEncode.js"
import { extensionPasskeyAuthenticatorDataCreate } from "./extensionPasskeyAuthenticatorDataCreate.js"
import { extensionPasskeyCredentialCreateRequestSchema } from "./extensionPasskeyCredentialCreateRequestSchema.js"
import { extensionPasskeyCredentialIdDecode } from "./extensionPasskeyCredentialIdDecode.js"
import { extensionPasskeyCredentialIdCreate } from "./extensionPasskeyCredentialIdCreate.js"
import { extensionPasskeyRpIdNormalize } from "./extensionPasskeyRpIdNormalize.js"

type ExtensionPasskeyCredentialCreateResult = {
  credential: BitwardenFido2Credential
  response: {
    id: string
    rawId: string
    response: {
      clientDataJSON: string
      authenticatorData: string
      attestationObject: string
      transports: ["internal"]
      publicKey: string
      publicKeyAlgorithm: -7
    }
    authenticatorAttachment: "platform"
    clientExtensionResults: Record<string, never>
    type: "public-key"
  }
}

function invalid(op: string, message: string): Result<ExtensionPasskeyCredentialCreateResult> {
  return resultErrorCreate(op, message, { code: "platform.invalid-request", statusCode: 400 })
}

export async function extensionPasskeyCredentialCreate(
  request: unknown,
  userVerified = false,
  now = Date.now,
): Promise<Result<ExtensionPasskeyCredentialCreateResult>> {
  const op = "extensionPasskeyCredentialCreate"
  const parsed = v.safeParse(extensionPasskeyCredentialCreateRequestSchema, request)
  if (!parsed.success) return invalid(op, "WebAuthn registration request is invalid.")
  const value = parsed.output
  const rpIdResult = extensionPasskeyRpIdNormalize(value.rpId)
  if (!rpIdResult.success) return rpIdResult
  const clientDataResult = base64UrlDecode(value.clientDataJSON)
  if (!clientDataResult.success || clientDataResult.data.byteLength === 0)
    return invalid(op, "WebAuthn client data is invalid.")
  if (value.userVerification === "required" && !userVerified)
    return invalid(op, "User verification is required for WebAuthn registration.")
  const userHandleResult = extensionPasskeyUserHandleRead(value.userId, op)
  if (!userHandleResult.success) return userHandleResult
  const createdAt = now()
  if (!Number.isSafeInteger(createdAt) || createdAt < 0)
    return invalid(op, "WebAuthn credential creation time is invalid.")
  for (const excludedId of value.excludeCredentialIds) {
    const excludedResult = extensionPasskeyCredentialIdDecode(excludedId)
    if (!excludedResult.success) return excludedResult
  }
  const keyPairResult = await passkeyKeyPairCreate()
  if (!keyPairResult.success) return keyPairResult
  const credentialIdResult = extensionPasskeyCredentialIdCreate()
  if (!credentialIdResult.success) return credentialIdResult
  const privateKeyResult = await cryptoKeyExport(keyPairResult.data.privateKey, "pkcs8", op)
  if (!privateKeyResult.success) return privateKeyResult
  const publicKeyResult = await cryptoKeyExport(keyPairResult.data.publicKey, "spki", op)
  if (!publicKeyResult.success) return publicKeyResult
  const publicJwkResult = await cryptoPublicJwkRead(keyPairResult.data.publicKey, op)
  if (!publicJwkResult.success) return publicJwkResult
  const xResult = extensionPasskeyCredentialIdBytesRead(publicJwkResult.data.x, op, 32)
  if (!xResult.success) return xResult
  const yResult = extensionPasskeyCredentialIdBytesRead(publicJwkResult.data.y, op, 32)
  if (!yResult.success) return yResult
  const resident = value.requireResidentKey || value.residentKey !== "discouraged"
  const userHandle = value.userId
  const credential: BitwardenFido2Credential = {
    credentialId: credentialIdResult.data.id,
    keyType: "public-key",
    keyAlgorithm: "ECDSA",
    keyCurve: "P-256",
    keyValue: base64UrlEncode(privateKeyResult.data),
    rpId: rpIdResult.data,
    userHandle,
    userName: value.userName,
    counter: 0,
    rpName: value.rpName,
    userDisplayName: value.userDisplayName,
    discoverable: resident,
    creationDate: new Date(createdAt).toISOString(),
  }
  const authDataResult = await extensionPasskeyAuthenticatorDataCreate({
    rpId: rpIdResult.data,
    counter: credential.counter,
    userVerification: userVerified,
    credentialId: credentialIdResult.data.bytes,
    publicKeyCoordinates: { x: xResult.data, y: yResult.data },
  })
  if (!authDataResult.success) return authDataResult
  const attestationResult = extensionCborEncode(
    new Map<string, unknown>([
      ["fmt", "none"],
      ["attStmt", new Map()],
      ["authData", authDataResult.data],
    ]),
  )
  if (!attestationResult.success) return attestationResult
  const rawId = base64UrlEncode(credentialIdResult.data.bytes)
  return resultCreate({
    credential,
    response: {
      id: rawId,
      rawId,
      response: {
        clientDataJSON: value.clientDataJSON,
        authenticatorData: base64UrlEncode(authDataResult.data),
        attestationObject: base64UrlEncode(attestationResult.data),
        transports: ["internal"],
        publicKey: base64UrlEncode(publicKeyResult.data),
        publicKeyAlgorithm: -7,
      },
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      type: "public-key",
    },
  })
}

async function passkeyKeyPairCreate(): Promise<Result<CryptoKeyPair>> {
  const op = "extensionPasskeyCredentialCreate"
  try {
    return resultCreate(
      await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]),
    )
  } catch {
    return resultErrorCreate(op, "WebAuthn key generation failed.", { code: "platform.internal", statusCode: 500 })
  }
}

async function cryptoKeyExport(key: CryptoKey, format: "pkcs8" | "spki", op: string): Promise<Result<Uint8Array>> {
  try {
    return resultCreate(new Uint8Array(await crypto.subtle.exportKey(format, key)))
  } catch {
    return resultErrorCreate(op, "WebAuthn private key export failed.", { code: "platform.internal", statusCode: 500 })
  }
}

async function cryptoPublicJwkRead(key: CryptoKey, op: string): Promise<Result<{ x: string; y: string }>> {
  try {
    const jwk = await crypto.subtle.exportKey("jwk", key)
    if (typeof jwk.x !== "string" || typeof jwk.y !== "string")
      return resultErrorCreate(op, "WebAuthn public key export failed.", { code: "platform.internal", statusCode: 500 })
    return resultCreate({ x: jwk.x, y: jwk.y })
  } catch {
    return resultErrorCreate(op, "WebAuthn public key export failed.", { code: "platform.internal", statusCode: 500 })
  }
}

function extensionPasskeyCredentialIdBytesRead(value: string, op: string, expectedLength: number): Result<Uint8Array> {
  const decodedResult = v.safeParse(v.pipe(v.string(), v.minLength(1)), value)
  if (!decodedResult.success)
    return resultErrorCreate(op, "WebAuthn byte value is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  const decodeResult = extensionPasskeyCredentialIdDecode(`b64.${value}`)
  if (!decodeResult.success || decodeResult.data.byteLength !== expectedLength)
    return resultErrorCreate(op, "WebAuthn byte value is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return resultCreate(decodeResult.data)
}

function extensionPasskeyUserHandleRead(value: string, op: string): Result<Uint8Array> {
  const decodedResult = base64UrlDecode(value)
  if (!decodedResult.success || decodedResult.data.byteLength === 0 || decodedResult.data.byteLength > 64)
    return resultErrorCreate(op, "WebAuthn user handle is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return decodedResult
}
