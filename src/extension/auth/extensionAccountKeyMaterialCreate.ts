import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { webAuthMasterKeyDerive } from "../../web/auth/model/webAuthMasterKeyDerive.js"
import { webAuthMasterPasswordHashDerive } from "../../web/auth/model/webAuthMasterPasswordHashDerive.js"
import { webAuthUserKeysGenerate } from "../../web/auth/model/webAuthUserKeysGenerate.js"

export async function extensionAccountKeyMaterialCreate(request: {
  email: string
  masterPassword: string
  kdf: 0
  kdfIterations: number
  kdfMemory: null
  kdfParallelism: null
}): Promise<
  Result<{
    masterPasswordHash: string
    userKey: Uint8Array
    userSymmetricKey: string
    keys: { encryptedPrivateKey: string; publicKey: string }
  }>
> {
  const kdfMetadata = {
    kdfType: request.kdf,
    iterations: request.kdfIterations,
    memory: request.kdfMemory,
    parallelism: request.kdfParallelism,
  }
  const keysResult = await webAuthUserKeysGenerate(request.masterPassword, request.email, kdfMetadata)
  if (!keysResult.success) return keysResult
  const masterKeyResult = await webAuthMasterKeyDerive(request.masterPassword, request.email, kdfMetadata)
  if (!masterKeyResult.success) {
    keysResult.data.userKey.fill(0)
    return masterKeyResult
  }
  const hashResult = await webAuthMasterPasswordHashDerive(request.masterPassword, masterKeyResult.data)
  masterKeyResult.data.fill(0)
  if (!hashResult.success) {
    keysResult.data.userKey.fill(0)
    return hashResult
  }
  return resultCreate({
    masterPasswordHash: hashResult.data,
    userKey: keysResult.data.userKey,
    userSymmetricKey: keysResult.data.wrappedUserKey,
    keys: {
      encryptedPrivateKey: keysResult.data.encryptedPrivateKey,
      publicKey: keysResult.data.publicKey,
    },
  })
}
