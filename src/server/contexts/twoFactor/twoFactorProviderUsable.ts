import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { twoFactorDuoCredentialsResolve } from "./twoFactorDuoCredentialsResolve.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorWebAuthnOriginResolve } from "./twoFactorWebAuthnOriginResolve.js"
import { twoFactorWebAuthnRegistrationsRead } from "./twoFactorWebAuthnRegistrationsRead.js"

export function twoFactorProviderUsable(
  type: number,
  data: string,
  config: Pick<
    IdentityConfig,
    | "DISABLE_2FA_REMEMBER"
    | "DUO_ENABLED"
    | "DUO_HOST"
    | "DUO_IKEY"
    | "DUO_SKEY"
    | "ENABLE_EMAIL_2FA"
    | "MAIL_ENABLED"
    | "YUBICO_CLIENT_ID"
    | "YUBICO_ENABLED"
    | "YUBICO_SECRET_KEY"
    | "WEBAUTHN_ENABLED"
  >,
  publicOrigin: string | undefined,
): boolean {
  if (type === twoFactorProviderType.authenticator || type === twoFactorProviderType.recoveryCode) return true
  if (type === twoFactorProviderType.email) return config.ENABLE_EMAIL_2FA && config.MAIL_ENABLED
  if (type === twoFactorProviderType.duo || type === twoFactorProviderType.organizationDuo)
    return twoFactorDuoCredentialsResolve(data, config).success
  if (type === twoFactorProviderType.yubikey)
    return (
      (config.YUBICO_ENABLED ?? false) &&
      (config.YUBICO_CLIENT_ID ?? "").trim() !== "" &&
      (config.YUBICO_SECRET_KEY ?? "").trim() !== "" &&
      twoFactorYubikeyDataUsable(data)
    )
  if (type === twoFactorProviderType.remember) return !config.DISABLE_2FA_REMEMBER
  if (type === twoFactorProviderType.webauthn)
    return twoFactorWebAuthnConfigured(config, publicOrigin) && twoFactorWebAuthnDataUsable(data)
  return false
}

function twoFactorWebAuthnConfigured(
  config: Pick<IdentityConfig, "WEBAUTHN_ENABLED">,
  publicOrigin: string | undefined,
): boolean {
  if (!(config.WEBAUTHN_ENABLED ?? true) || publicOrigin === undefined) return false
  return twoFactorWebAuthnOriginResolve(publicOrigin).success
}

function twoFactorWebAuthnDataUsable(data: string): boolean {
  const registrationsResult = twoFactorWebAuthnRegistrationsRead(data)
  if (!registrationsResult.success) return false
  const registrations = registrationsResult.data
  return (
    registrations.length > 0 &&
    registrations.every(
      (registration) =>
        registration.credential !== undefined &&
        registration.credential.id === registration.credentialId &&
        typeof registration.credential.publicKey === "string" &&
        registration.credential.publicKey !== "" &&
        Number.isSafeInteger(registration.credential.counter) &&
        (registration.credential.counter ?? -1) >= 0,
    )
  )
}

function twoFactorYubikeyDataUsable(data: string): boolean {
  try {
    const parsed = JSON.parse(data) as { keys?: unknown; Keys?: unknown }
    const keys = parsed.keys ?? parsed.Keys
    return Array.isArray(keys) && keys.length > 0 && keys.every((key) => typeof key === "string" && key.length === 12)
  } catch {
    return false
  }
}
