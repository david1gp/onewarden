import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { twoFactorEmailTokenCreate } from "./twoFactorEmailTokenCreate.js"
import { twoFactorProtectedActionInvalidate } from "./twoFactorProtectedActionInvalidate.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"

export async function twoFactorProtectedActionCreate(
  database: DatabaseConnection,
  user: IdentityUser,
  clock: Clock,
  identifier: Identifier,
  config: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME" | "EMAIL_TOKEN_SIZE" | "MAIL_ENABLED">,
  mail: IdentityMailAdapter,
): Promise<Result<void>> {
  const op = "twoFactorProtectedActionCreate"
  if (!config.MAIL_ENABLED)
    return resultErrorCreate(
      op,
      "Email is disabled for this server. Either enable email or login using your master password instead of login via device.",
    )
  try {
    const existing = database
      .query<{ uuid: string }, [string, number]>("SELECT uuid FROM twofactor WHERE user_uuid = ? AND atype = ? LIMIT 1")
      .get(user.uuid, twoFactorProviderType.protectedActions)
    if (existing !== null) {
      const existingData = database
        .query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ? LIMIT 1")
        .get(existing.uuid)
      if (existingData === null) return resultErrorCreate(op, "Protected action token not found.")
      let tokenSent: number
      try {
        const parsed = JSON.parse(existingData.data) as { token_sent?: unknown }
        if (typeof parsed.token_sent !== "number" || !Number.isSafeInteger(parsed.token_sent))
          return resultErrorCreate(op, "Protected action token is invalid", {
            code: "platform.invalid-request",
            statusCode: 400,
          })
        tokenSent = parsed.token_sent
      } catch {
        return resultErrorCreate(op, "Protected action token is invalid", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      const elapsed = Math.floor(clock.now().getTime() / 1_000) - tokenSent
      if (elapsed < 30)
        return resultErrorCreate(op, `Please wait ${30 - elapsed} seconds before requesting another code.`, {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      database.run("DELETE FROM twofactor WHERE uuid = ?", [existing.uuid])
    }
    const tokenSize = config.EMAIL_TOKEN_SIZE ?? 6
    if (!Number.isSafeInteger(tokenSize) || tokenSize < 1 || tokenSize > 32)
      return resultErrorCreate(op, "Invalid email token size.")
    const tokenResult = twoFactorEmailTokenCreate(tokenSize)
    if (!tokenResult.success) return tokenResult
    const token = tokenResult.data
    const record = {
      uuid: identifier.uuid(),
      userUuid: user.uuid,
      type: twoFactorProviderType.protectedActions,
      enabled: true,
      data: JSON.stringify({ token, token_sent: Math.floor(clock.now().getTime() / 1_000), attempts: 0 }),
      lastUsed: 0,
    }
    const saveResult = twoFactorRecordSave(database, record)
    if (!saveResult.success) return saveResult
    let sendResult: Result<void>
    try {
      sendResult =
        mail.sendProtectedActionToken === undefined
          ? resultErrorCreate(op, "Protected action token email failed.")
          : await mail.sendProtectedActionToken(user.email, token)
    } catch {
      sendResult = resultErrorCreate(op, "Protected action token email failed.")
    }
    if (!sendResult.success) {
      const invalidateResult = twoFactorProtectedActionInvalidate(database, user.uuid, record.data)
      if (!invalidateResult.success) return invalidateResult
      return sendResult
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Protected action token creation failed.")
  }
}
