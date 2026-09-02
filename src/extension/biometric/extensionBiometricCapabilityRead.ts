import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import type { ExtensionBiometricCapability } from "./extensionBiometricCapabilitySchema.js"

type BiometricPlatform = {
  credentials?: { create?: unknown; get?: unknown }
  publicKeyCredential?: {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>
    getClientCapabilities?: () => Promise<unknown>
  }
}

export async function extensionBiometricCapabilityRead(
  platform: BiometricPlatform = {
    credentials: globalThis.navigator?.credentials,
    publicKeyCredential: globalThis.PublicKeyCredential as unknown as BiometricPlatform["publicKeyCredential"],
  },
): Promise<Result<ExtensionBiometricCapability>> {
  if (
    platform.credentials === undefined ||
    typeof platform.credentials.create !== "function" ||
    typeof platform.credentials.get !== "function" ||
    platform.publicKeyCredential === undefined
  )
    return resultCreate({ status: "unsupported" })

  const isUserVerifyingPlatformAuthenticatorAvailable =
    platform.publicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  const getClientCapabilities = platform.publicKeyCredential.getClientCapabilities
  if (isUserVerifyingPlatformAuthenticatorAvailable === undefined || getClientCapabilities === undefined)
    return resultCreate({ status: "unsupported" })

  let platformAuthenticatorAvailable: boolean
  try {
    platformAuthenticatorAvailable = await isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return resultCreate({ status: "unavailable" })
  }
  if (platformAuthenticatorAvailable !== true) return resultCreate({ status: "unavailable" })

  let capabilities: unknown
  try {
    capabilities = await getClientCapabilities()
  } catch {
    return resultCreate({ status: "unsupported" })
  }
  if (typeof capabilities !== "object" || capabilities === null || (capabilities as { prf?: unknown }).prf !== true)
    return resultCreate({ status: "unsupported" })

  return resultCreate({ status: "available", platformAuthenticator: true, prf: true })
}
