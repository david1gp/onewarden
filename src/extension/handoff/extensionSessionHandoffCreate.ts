import { type Result } from "#result"
import type { extensionBitwardenApiClientCreate } from "../api/extensionBitwardenApiClientCreate.js"
import type { extensionVaultSessionCreate } from "../session/extensionVaultSessionCreate.js"
import { sessionHandoffFragmentCreate } from "../../shared/sessionHandoff/sessionHandoffFragmentCreate.js"
import type { SessionHandoffOperation } from "../../shared/sessionHandoff/sessionHandoffOperationSchema.js"

type ExtensionSessionHandoffCreateOptions = {
  accessToken: string
  apiClient: Pick<ReturnType<typeof extensionBitwardenApiClientCreate>, "sessionHandoffCreate">
  cipherId: string | null
  operation: SessionHandoffOperation
  vaultSession: Pick<ReturnType<typeof extensionVaultSessionCreate>, "sessionHandoffEncrypt">
  webVaultOrigin: string
}

export async function extensionSessionHandoffCreate(
  options: ExtensionSessionHandoffCreateOptions,
): Promise<Result<string>> {
  const encryptedResult = await options.vaultSession.sessionHandoffEncrypt(options.operation, options.cipherId)
  if (!encryptedResult.success) return encryptedResult
  const transferKey = encryptedResult.data.transferKey
  const createResult = await options.apiClient.sessionHandoffCreate({
    accessToken: options.accessToken,
    operation: options.operation,
    cipherId: options.cipherId,
    encryptedUserKey: encryptedResult.data.encryptedUserKey,
  } as Parameters<typeof options.apiClient.sessionHandoffCreate>[0])
  if (!createResult.success) {
    transferKey.fill(0)
    return createResult
  }
  const fragmentResult = sessionHandoffFragmentCreate(
    options.webVaultOrigin,
    createResult.data.token,
    transferKey,
    options.operation,
    options.cipherId,
  )
  transferKey.fill(0)
  return fragmentResult
}
