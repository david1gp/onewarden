import { type Result } from "#result"
import type { BitwardenEncryptedFido2Credential } from "../../shared/api/bitwardenEncryptedFido2CredentialSchema.js"
import type { BitwardenFido2Credential } from "../../shared/api/bitwardenFido2CredentialSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringDecryptText } from "./extensionEncStringDecryptText.js"

async function nullableStringDecrypt(
  value: string | null | undefined,
  key: Uint8Array,
): Promise<Result<string | null | undefined>> {
  if (value === null || value === undefined) return resultCreate(value)
  return extensionEncStringDecryptText(value, key)
}

export async function extensionFido2CredentialDecrypt(
  credential: BitwardenEncryptedFido2Credential,
  key: Uint8Array,
): Promise<Result<BitwardenFido2Credential>> {
  const op = "extensionFido2CredentialDecrypt"
  const credentialId = await extensionEncStringDecryptText(credential.credentialId, key)
  if (!credentialId.success) return credentialId
  const keyType = await extensionEncStringDecryptText(credential.keyType, key)
  if (!keyType.success) return keyType
  const keyAlgorithm = await extensionEncStringDecryptText(credential.keyAlgorithm, key)
  if (!keyAlgorithm.success) return keyAlgorithm
  const keyCurve = await extensionEncStringDecryptText(credential.keyCurve, key)
  if (!keyCurve.success) return keyCurve
  const keyValue = await extensionEncStringDecryptText(credential.keyValue, key)
  if (!keyValue.success) return keyValue
  const rpId = await extensionEncStringDecryptText(credential.rpId, key)
  if (!rpId.success) return rpId
  const userHandle = await nullableStringDecrypt(credential.userHandle, key)
  if (!userHandle.success) return userHandle
  const userName = await nullableStringDecrypt(credential.userName, key)
  if (!userName.success) return userName
  const counterText = await extensionEncStringDecryptText(credential.counter, key)
  if (!counterText.success) return counterText
  const counter = Number.parseInt(counterText.data, 10)
  if (!Number.isSafeInteger(counter) || counter < 0) {
    return resultErrorCreate(op, "FIDO2 credential counter is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const rpName = await nullableStringDecrypt(credential.rpName, key)
  if (!rpName.success) return rpName
  const userDisplayName = await nullableStringDecrypt(credential.userDisplayName, key)
  if (!userDisplayName.success) return userDisplayName
  const discoverableText = await extensionEncStringDecryptText(credential.discoverable, key)
  if (!discoverableText.success) return discoverableText
  if (discoverableText.data !== "true" && discoverableText.data !== "false") {
    return resultErrorCreate(op, "FIDO2 credential discoverable value is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  return resultCreate({
    ...credential,
    credentialId: credentialId.data,
    keyType: keyType.data,
    keyAlgorithm: keyAlgorithm.data,
    keyCurve: keyCurve.data,
    keyValue: keyValue.data,
    rpId: rpId.data,
    ...(credential.userHandle === undefined ? {} : { userHandle: userHandle.data }),
    ...(credential.userName === undefined ? {} : { userName: userName.data }),
    counter,
    ...(credential.rpName === undefined ? {} : { rpName: rpName.data }),
    ...(credential.userDisplayName === undefined ? {} : { userDisplayName: userDisplayName.data }),
    discoverable: discoverableText.data === "true",
  })
}
