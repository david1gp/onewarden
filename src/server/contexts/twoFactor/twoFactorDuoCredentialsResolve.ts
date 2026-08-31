import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { TwoFactorDuoCredentials } from "./twoFactorAdapters.js"
import { twoFactorDuoDataSchema } from "./twoFactorDuoDataSchema.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"

export function twoFactorDuoCredentialsResolve(
  data: string,
  config: Pick<IdentityConfig, "DUO_ENABLED" | "DUO_HOST" | "DUO_IKEY" | "DUO_SKEY">,
): Result<TwoFactorDuoCredentials> {
  const op = "twoFactorDuoCredentialsResolve"
  const dataResult = twoFactorPersistedJsonParse(op, data, twoFactorDuoDataSchema, "Duo credentials are invalid")
  if (dataResult.success)
    return resultCreate({
      clientId: dataResult.data.ik.trim(),
      clientSecret: dataResult.data.sk.trim(),
      host: dataResult.data.host.trim(),
    })

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
