import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { webAuthMasterKeyDerive } from "../../auth/model/webAuthMasterKeyDerive.js"
import { webAuthMasterPasswordHashDerive } from "../../auth/model/webAuthMasterPasswordHashDerive.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthUserKeysGenerate } from "../../auth/model/webAuthUserKeysGenerate.js"
import { webSettingsApiClientCreate } from "./webSettingsApiClientCreate.js"

export interface AccountKeysRotateExecuteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  currentPassword: string
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

export async function accountKeysRotateExecute(options: AccountKeysRotateExecuteOptions): Promise<Result<void>> {
  const op = "accountKeysRotateExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to rotate account keys.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  if (options.currentPassword.length === 0) {
    return resultErrorCreate(op, "Master password is required to rotate account encryption keys.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const kdfMetadata = {
    kdfType: currentSession.kdf,
    iterations: currentSession.kdfIterations,
    memory: currentSession.kdfMemory,
    parallelism: currentSession.kdfParallelism,
  }

  // Derive master password hash
  const masterKeyResult = await webAuthMasterKeyDerive(options.currentPassword, currentSession.email, kdfMetadata)
  if (!masterKeyResult.success) return masterKeyResult
  const masterHashResult = await webAuthMasterPasswordHashDerive(options.currentPassword, masterKeyResult.data)
  masterKeyResult.data.fill(0)
  if (!masterHashResult.success) return masterHashResult

  // Generate brand new user keys and RSA keypair
  const newKeysResult = await webAuthUserKeysGenerate(options.currentPassword, currentSession.email, kdfMetadata)
  if (!newKeysResult.success) return newKeysResult

  const client = options.apiClient ?? webSettingsApiClientCreate()
  const rotateResult = await client.keysRotate(currentSession.accessToken, {
    accountUnlockData: {
      emergencyAccessUnlockData: [],
      masterPasswordUnlockData: {
        kdfType: kdfMetadata.kdfType,
        kdfIterations: kdfMetadata.iterations,
        kdfParallelism: kdfMetadata.parallelism,
        kdfMemory: kdfMetadata.memory,
        email: currentSession.email,
        masterKeyAuthenticationHash: masterHashResult.data,
        masterKeyEncryptedUserKey: newKeysResult.data.wrappedUserKey,
      },
      organizationAccountRecoveryUnlockData: [],
    },
    accountKeys: {
      userKeyEncryptedAccountPrivateKey: newKeysResult.data.encryptedPrivateKey,
      accountPublicKey: newKeysResult.data.publicKey,
    },
    accountData: {
      ciphers: [],
      folders: [],
      sends: [],
    },
    oldMasterKeyAuthenticationHash: masterHashResult.data,
  })

  if (!rotateResult.success) return rotateResult
  return resultCreate(undefined)
}
