import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { TwoFactorDuoCredentials } from "./twoFactorAdapters.js"

export function twoFactorDuoCredentialsResolve(
  data: string,
  config: Pick<IdentityConfig, "DUO_ENABLED" | "DUO_HOST" | "DUO_IKEY" | "DUO_SKEY">,
): Result<TwoFactorDuoCredentials> {
  const op = "twoFactorDuoCredentialsResolve"
  try {
    const parsed = JSON.parse(data) as { host?: unknown; ik?: unknown; sk?: unknown }
    if (
      typeof parsed.host === "string" &&
      parsed.host.trim() !== "" &&
      typeof parsed.ik === "string" &&
      parsed.ik.trim() !== "" &&
      typeof parsed.sk === "string" &&
      parsed.sk.trim() !== ""
    )
      return resultCreate({ clientId: parsed.ik.trim(), clientSecret: parsed.sk.trim(), host: parsed.host.trim() })
  } catch {
    // An empty or legacy record can fall back to the global Duo configuration.
  }

  if (
    (config.DUO_ENABLED ?? true) &&
    config.DUO_HOST.trim() !== "" &&
    config.DUO_IKEY.trim() !== "" &&
    config.DUO_SKEY.trim() !== ""
  )
    return resultCreate({
      clientId: config.DUO_IKEY.trim(),
      clientSecret: config.DUO_SKEY.trim(),
      host: config.DUO_HOST.trim(),
    })

  return resultErrorCreate(op, "Duo is not configured")
}
