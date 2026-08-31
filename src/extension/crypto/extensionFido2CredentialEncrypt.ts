import { type Result } from "#result"
import type { BitwardenEncryptedFido2Credential } from "../../shared/api/bitwardenEncryptedFido2CredentialSchema.js"
import type { BitwardenFido2Credential } from "../../shared/api/bitwardenFido2CredentialSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { extensionEncStringEncrypt } from "./extensionEncStringEncrypt.js"

async function nullableStringEncrypt(
  value: string | null | undefined,
  key: Uint8Array,
): Promise<Result<string | null | undefined>> {
  if (value === null || value === undefined) return resultCreate(value)
  return extensionEncStringEncrypt(value, key)
}

export async function extensionFido2CredentialEncrypt(
  credential: BitwardenFido2Credential,
  key: Uint8Array,
): Promise<Result<BitwardenEncryptedFido2Credential>> {
  const credentialId = await extensionEncStringEncrypt(credential.credentialId, key)
  if (!credentialId.success) return credentialId
  const keyType = await extensionEncStringEncrypt(credential.keyType, key)
  if (!keyType.success) return keyType
  const keyAlgorithm = await extensionEncStringEncrypt(credential.keyAlgorithm, key)
  if (!keyAlgorithm.success) return keyAlgorithm
  const keyCurve = await extensionEncStringEncrypt(credential.keyCurve, key)
  if (!keyCurve.success) return keyCurve
  const keyValue = await extensionEncStringEncrypt(credential.keyValue, key)
  if (!keyValue.success) return keyValue
  const rpId = await extensionEncStringEncrypt(credential.rpId, key)
  if (!rpId.success) return rpId
  const userHandle = await nullableStringEncrypt(credential.userHandle, key)
  if (!userHandle.success) return userHandle
  const userName = await nullableStringEncrypt(credential.userName, key)
  if (!userName.success) return userName
  const counter = await extensionEncStringEncrypt(String(credential.counter), key)
  if (!counter.success) return counter
  const rpName = await nullableStringEncrypt(credential.rpName, key)
  if (!rpName.success) return rpName
  const userDisplayName = await nullableStringEncrypt(credential.userDisplayName, key)
  if (!userDisplayName.success) return userDisplayName
  const discoverable = await extensionEncStringEncrypt(String(credential.discoverable), key)
  if (!discoverable.success) return discoverable

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
    counter: counter.data,
    ...(credential.rpName === undefined ? {} : { rpName: rpName.data }),
    ...(credential.userDisplayName === undefined ? {} : { userDisplayName: userDisplayName.data }),
    discoverable: discoverable.data,
  })
}
