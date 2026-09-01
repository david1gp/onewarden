import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorProtectedActionDataSchema } from "./twoFactorProtectedActionDataSchema.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { and, eq } from "drizzle-orm"

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
    database.drizzle.transaction((transaction) => {
      const row = transaction
        .select({ uuid: twoFactor.uuid, data: twoFactor.data })
        .from(twoFactor)
        .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.atype, twoFactorProviderType.protectedActions)))
        .limit(1)
        .get()
      if (row === undefined) {
        validationResult = resultErrorCreate(
          op,
          "Protected action token not found, try sending the code again or restart the process",
          { code: "platform.invalid-request", statusCode: 400 },
        )
        return
      }
      const dataResult = twoFactorPersistedJsonParse(
        op,
        row.data,
        twoFactorProtectedActionDataSchema,
        "Protected action token is invalid",
      )
      if (!dataResult.success) {
        transaction.delete(twoFactor).where(eq(twoFactor.uuid, row.uuid)).run()
        validationResult = resultErrorCreate(op, "Protected action token is invalid", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      const data = dataResult.data
      const limit = config.EMAIL_ATTEMPTS_LIMIT ?? 3
      const attempts = Math.min(Number.MAX_SAFE_INTEGER, data.attempts + 1)
      if (attempts >= limit) {
        transaction
          .update(twoFactor)
          .set({ data: JSON.stringify({ ...data, attempts }) })
          .where(eq(twoFactor.uuid, row.uuid))
          .run()
        validationResult = resultErrorCreate(op, "Token has expired", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      const age = Math.floor(clock.now().getTime() / 1_000) - data.token_sent
      if (age < 0 || age > (config.EMAIL_EXPIRATION_TIME ?? 600)) {
        transaction.delete(twoFactor).where(eq(twoFactor.uuid, row.uuid)).run()
        validationResult = resultErrorCreate(op, "Token has expired", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
        return
      }
      if (!constantTimeStringsEqual(data.token, token)) {
        transaction
          .update(twoFactor)
          .set({ data: JSON.stringify({ ...data, attempts }) })
          .where(eq(twoFactor.uuid, row.uuid))
          .run()
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
      if (deleteIfValid) transaction.delete(twoFactor).where(eq(twoFactor.uuid, row.uuid)).run()
      validationResult = resultCreate(undefined)
    })
    return validationResult ?? resultErrorCreate(op, "Protected action token validation failed.")
  } catch {
    return resultErrorCreate(op, "Protected action token is invalid", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}
