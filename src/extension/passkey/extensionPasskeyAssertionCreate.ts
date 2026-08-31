import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenFido2Credential } from "../../shared/api/bitwardenFido2CredentialSchema.js"
import { base64UrlEncode } from "../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionPasskeyAssertionRequestSchema } from "./extensionPasskeyAssertionRequestSchema.js"
import { extensionPasskeyAuthenticatorDataCreate } from "./extensionPasskeyAuthenticatorDataCreate.js"
import { extensionPasskeyClientDataHashCreate } from "./extensionPasskeyClientDataHashCreate.js"
import { extensionPasskeyCredentialIdDecode } from "./extensionPasskeyCredentialIdDecode.js"
import { extensionPasskeyPrivateKeyImport } from "./extensionPasskeyPrivateKeyImport.js"
import { extensionPasskeyRpIdNormalize } from "./extensionPasskeyRpIdNormalize.js"
import { extensionPasskeySignatureCreate } from "./extensionPasskeySignatureCreate.js"

type ExtensionPasskeyAssertionCreateResult = {
  credential: BitwardenFido2Credential
  response: {
    id: string
    rawId: string
    response: {
      clientDataJSON: string
      authenticatorData: string
      signature: string
      userHandle: string | null
    }
    authenticatorAttachment: "platform"
    clientExtensionResults: Record<string, never>
    type: "public-key"
  }
}

function invalid(op: string, message: string): Result<ExtensionPasskeyAssertionCreateResult> {
  return resultErrorCreate(op, message, { code: "platform.invalid-request", statusCode: 400 })
}

function credentialIdMatches(credentialId: string, candidateId: string): boolean {
  const leftResult = extensionPasskeyCredentialIdDecode(credentialId)
  const rightResult = extensionPasskeyCredentialIdDecode(candidateId)
  if (!leftResult.success || !rightResult.success || leftResult.data.byteLength !== rightResult.data.byteLength)
    return false
  return leftResult.data.every((byte, index) => byte === rightResult.data[index])
}

function counterNextRead(counter: number): Result<number> {
  const op = "extensionPasskeyAssertionCreate"
  if (!Number.isSafeInteger(counter) || counter < 0 || counter > 0xffffffff)
    return resultErrorCreate(op, "WebAuthn sign counter is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  if (counter === 0) return resultCreate(0)
  if (counter === 0xffffffff) return resultErrorCreate(op, "WebAuthn sign counter is exhausted.")
  return resultCreate(counter + 1)
}

function credentialSupported(credential: BitwardenFido2Credential): boolean {
  return credential.keyType === "public-key" && credential.keyAlgorithm === "ECDSA" && credential.keyCurve === "P-256"
}

export async function extensionPasskeyAssertionCreate(
  request: unknown,
  credentials: readonly BitwardenFido2Credential[],
  userVerified = false,
): Promise<Result<ExtensionPasskeyAssertionCreateResult>> {
  const op = "extensionPasskeyAssertionCreate"
  const parsed = v.safeParse(extensionPasskeyAssertionRequestSchema, request)
  if (!parsed.success) return invalid(op, "WebAuthn assertion request is invalid.")
  const value = parsed.output
  const rpIdResult = extensionPasskeyRpIdNormalize(value.rpId)
  if (!rpIdResult.success) return rpIdResult
  if (value.userVerification === "required" && !userVerified)
    return invalid(op, "User verification is required for WebAuthn authentication.")

  const allowIds = value.allowCredentialIds
  const candidates = credentials.filter((credential) => {
    if (!credentialSupported(credential)) return false
    const credentialRpResult = extensionPasskeyRpIdNormalize(credential.rpId)
    if (!credentialRpResult.success || credentialRpResult.data !== rpIdResult.data) return false
    if (value.userHandle !== null && value.userHandle !== undefined && credential.userHandle !== value.userHandle)
      return false
    if (allowIds.length > 0 && !allowIds.some((id) => credentialIdMatches(credential.credentialId, id))) return false
    if (allowIds.length === 0 && !credential.discoverable) return false
    return true
  })
  if (candidates.length === 0) return invalid(op, "No matching WebAuthn credential was found.")
  const selected =
    value.credentialId === null
      ? candidates.length === 1
        ? candidates[0]
        : undefined
      : candidates.find((credential) => credentialIdMatches(credential.credentialId, value.credentialId as string))
  if (selected === undefined) return invalid(op, "WebAuthn credential selection is required.")
  if (value.consent?.credentialId !== undefined && value.consent.credentialId !== null) {
    if (!credentialIdMatches(selected.credentialId, value.consent.credentialId))
      return invalid(op, "WebAuthn consent does not match the selected credential.")
  }
  const credentialIdResult = extensionPasskeyCredentialIdDecode(selected.credentialId)
  if (!credentialIdResult.success) return credentialIdResult
  const counterResult = counterNextRead(selected.counter)
  if (!counterResult.success) return counterResult
  const authDataResult = await extensionPasskeyAuthenticatorDataCreate({
    rpId: rpIdResult.data,
    counter: counterResult.data,
    userVerification: userVerified,
  })
  if (!authDataResult.success) return authDataResult
  const clientDataHashResult = await extensionPasskeyClientDataHashCreate(value.clientDataJSON)
  if (!clientDataHashResult.success) return clientDataHashResult
  const privateKeyResult = await extensionPasskeyPrivateKeyImport(selected.keyValue)
  if (!privateKeyResult.success) return privateKeyResult
  const signatureResult = await extensionPasskeySignatureCreate(
    authDataResult.data,
    clientDataHashResult.data,
    privateKeyResult.data,
  )
  if (!signatureResult.success) return signatureResult
  const rawId = base64UrlEncode(credentialIdResult.data)
  return resultCreate({
    credential: { ...selected, counter: counterResult.data },
    response: {
      id: rawId,
      rawId,
      response: {
        clientDataJSON: value.clientDataJSON,
        authenticatorData: base64UrlEncode(authDataResult.data),
        signature: base64UrlEncode(signatureResult.data),
        userHandle: selected.userHandle ?? null,
      },
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      type: "public-key",
    },
  })
}
