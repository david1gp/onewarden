import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"

type TwoFactorProtectedActionData = {
  token: string
  token_sent: number
  attempts: number
}

export function twoFactorProtectedActionValidate(
  database: DatabaseConnection,
  userUuid: string,
  token: string,
  clock: Clock,
  config: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME">,
  deleteIfValid: boolean,
): Result<void> {
  const op = "twoFactorProtectedActionValidate"
  let validationResult: Result<void> | undefined
  try {
    const transaction = database.transaction(() => {
      const row = database
        .query<{ uuid: string; data: string }, [string, number]>(
          "SELECT uuid, data FROM twofactor WHERE user_uuid = ? AND atype = ? LIMIT 1",
        )
        .get(userUuid, twoFactorProviderType.protectedActions)
      if (row === null) {
        validationResult = resultErrorCreate(
          op,
          "Protected action token not found, try sending the code again or restart the process",
          { code: "platform.invalid-request", statusCode: 400 },
        )
        return
      }
      let data: Partial<TwoFactorProtectedActionData>
      try {
        const parsed = JSON.parse(row.data) as Partial<TwoFactorProtectedActionData>
        if (typeof parsed !== "object" || parsed === null) throw new Error("invalid data")
        data = parsed
      } catch {
        database.run("DELETE FROM twofactor WHERE uuid = ?", [row.uuid])
        validationResult = resultErrorCreate(op, "Protected action token is invalid", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      if (
        typeof data.token !== "string" ||
        typeof data.token_sent !== "number" ||
        !Number.isSafeInteger(data.token_sent) ||
        typeof data.attempts !== "number" ||
        !Number.isSafeInteger(data.attempts) ||
        data.attempts < 0
      ) {
        database.run("DELETE FROM twofactor WHERE uuid = ?", [row.uuid])
        validationResult = resultErrorCreate(op, "Protected action token is invalid", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      const limit = config.EMAIL_ATTEMPTS_LIMIT ?? 3
      const attempts = Math.min(Number.MAX_SAFE_INTEGER, data.attempts + 1)
      if (attempts >= limit) {
        database.run("UPDATE twofactor SET data = ? WHERE uuid = ?", [JSON.stringify({ ...data, attempts }), row.uuid])
        validationResult = resultErrorCreate(op, "Token has expired", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      const age = Math.floor(clock.now().getTime() / 1_000) - data.token_sent
      if (age < 0 || age > (config.EMAIL_EXPIRATION_TIME ?? 600)) {
        database.run("DELETE FROM twofactor WHERE uuid = ?", [row.uuid])
        validationResult = resultErrorCreate(op, "Token has expired", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      if (!constantTimeStringsEqual(data.token, token)) {
        database.run("UPDATE twofactor SET data = ? WHERE uuid = ?", [JSON.stringify({ ...data, attempts }), row.uuid])
        validationResult = resultErrorCreate(op, "Token is invalid", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        if (attempts >= limit)
          validationResult = resultErrorCreate(op, "Token has expired", {
            code: "platform.invalid-request",
            statusCode: 400,
          })
        return
      }
      if (deleteIfValid) database.run("DELETE FROM twofactor WHERE uuid = ?", [row.uuid])
      validationResult = resultCreate(undefined)
    })
    transaction()
    return validationResult ?? resultErrorCreate(op, "Protected action token validation failed.")
  } catch {
    return resultErrorCreate(op, "Protected action token is invalid", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}
