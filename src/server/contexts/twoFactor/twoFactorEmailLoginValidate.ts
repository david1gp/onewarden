import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { TwoFactorEmailData } from "./twoFactorEmailData.js"
import { twoFactorEmailDataSchema } from "./twoFactorEmailDataSchema.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"

export function twoFactorEmailLoginValidate(
  database: DatabaseConnection,
  userUuid: string,
  token: string,
  clock: Clock,
  config: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME">,
  providerType: number = twoFactorProviderType.email,
): Result<undefined> {
  const op = "twoFactorEmailLoginValidate"
  let validationResult: Result<undefined> | undefined
  try {
    const transaction = database.transaction(() => {
      const row = database
        .query<{ uuid: string; data: string }, [string, number]>(
          "SELECT uuid, data FROM twofactor WHERE user_uuid = ? AND atype = ? LIMIT 1",
        )
        .get(userUuid, providerType)
      if (row === null) {
        validationResult = twoFactorEmailValidationError(op, "Two factor not found")
        return
      }

      const emailDataResult = twoFactorPersistedJsonParse(
        op,
        row.data,
        twoFactorEmailDataSchema,
        "Could not decode EmailTokenData from string",
      )
      if (!emailDataResult.success) {
        database.run("DELETE FROM twofactor WHERE uuid = ?", [row.uuid])
        validationResult = twoFactorEmailValidationError(op, "Could not decode EmailTokenData from string")
        return
      }
      const emailData: TwoFactorEmailData = emailDataResult.data

      if (emailData.last_token === null) {
        validationResult = twoFactorEmailValidationError(op, "No token available!")
        return
      }
      if (!constantTimeStringsEqual(emailData.last_token, token)) {
        const attempts = Math.min(Number.MAX_SAFE_INTEGER, emailData.attempts + 1)
        const limit = config.EMAIL_ATTEMPTS_LIMIT ?? 3
        const nextData = {
          ...emailData,
          attempts,
          last_token: attempts >= limit ? null : emailData.last_token,
        }
        database.run("UPDATE twofactor SET data = ? WHERE uuid = ?", [JSON.stringify(nextData), row.uuid])
        validationResult = twoFactorEmailValidationError(op, "Token is invalid")
        return
      }

      database.run("UPDATE twofactor SET data = ? WHERE uuid = ?", [
        JSON.stringify({ ...emailData, last_token: null, attempts: 0 }),
        row.uuid,
      ])
      const age = Math.floor(clock.now().getTime() / 1_000) - emailData.token_sent
      if (age < 0 || age > (config.EMAIL_EXPIRATION_TIME ?? 600)) {
        validationResult = twoFactorEmailValidationError(op, "Token has expired")
        return
      }
      validationResult = resultCreate(undefined)
    })
    transaction()
    return validationResult ?? resultErrorCreate(op, "Email token validation failed.")
  } catch {
    return twoFactorEmailValidationError(op, "Email token validation failed.")
  }
}

function twoFactorEmailValidationError(op: string, message: string): Result<undefined> {
  return resultErrorCreate(op, message, { code: "platform.invalid-request", statusCode: 400 })
}
