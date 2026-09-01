import { and, eq, sql } from "drizzle-orm"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import {
  type SendRecipientVerificationInsert,
  type SendRecipientVerificationRow,
  sendRecipientVerifications,
} from "../../database/schema/sendRecipientVerifications.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import { twoFactorEmailTokenCreate } from "../twoFactor/twoFactorEmailTokenCreate.js"

const sendRecipientVerificationResendCooldownSeconds = 30
const sendRecipientVerificationResendLimit = 5

export async function sendRecipientVerificationIssue(
  database: DatabaseConnection,
  sendUuid: string,
  email: string,
  clock: Clock,
  config: Pick<IdentityConfig, "EMAIL_EXPIRATION_TIME" | "EMAIL_TOKEN_SIZE">,
  mail: IdentityMailAdapter,
): Promise<Result<void>> {
  const tokenResult = twoFactorEmailTokenCreate(config.EMAIL_TOKEN_SIZE ?? 6)
  if (!tokenResult.success) return tokenResult
  const saltResult = secureRandomBytes(32)
  if (!saltResult.success) return saltResult
  const salt = base64UrlEncode(saltResult.data)
  const hashResult = await sha256Hex(`${salt}:${tokenResult.data}`)
  if (!hashResult.success) return hashResult

  const now = clock.now()
  const nowTimestamp = now.getTime()
  const expiresAt = new Date(nowTimestamp + Math.max(0, config.EMAIL_EXPIRATION_TIME ?? 600) * 1_000).toISOString()
  const persistenceResult = databaseTransaction(database, () => {
    const row = database.drizzle
      .select()
      .from(sendRecipientVerifications)
      .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
      .limit(1)
      .get()

    if (row !== undefined && sendRecipientVerificationRowIsValid(row)) {
      const lastSentAt = Date.parse(row.lastSentAt)
      if (!Number.isFinite(lastSentAt)) {
        database.drizzle
          .delete(sendRecipientVerifications)
          .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
          .run()
      } else {
        if (row.resendCount >= sendRecipientVerificationResendLimit)
          return sendRecipientVerificationError("Too many verification code requests.", 429, "rate_limited")
        if (nowTimestamp < lastSentAt + sendRecipientVerificationResendCooldownSeconds * 1_000)
          return sendRecipientVerificationError(
            "Please wait before requesting another verification code.",
            429,
            "rate_limited",
          )
      }
    } else if (row !== undefined) {
      database.drizzle
        .delete(sendRecipientVerifications)
        .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
        .run()
    }

    if (row === undefined || !sendRecipientVerificationRowIsValid(row)) {
      const values: SendRecipientVerificationInsert = {
        sendUuid,
        email,
        otpHash: hashResult.data,
        otpSalt: salt,
        otpExpiresAt: expiresAt,
        attempts: 0,
        lastSentAt: now.toISOString(),
        resendCount: 0,
      }
      database.drizzle.insert(sendRecipientVerifications).values(values).run()
    } else {
      database.drizzle
        .update(sendRecipientVerifications)
        .set({
          otpHash: hashResult.data,
          otpSalt: salt,
          otpExpiresAt: expiresAt,
          attempts: 0,
          lastSentAt: now.toISOString(),
          resendCount: sql`${sendRecipientVerifications.resendCount} + 1`,
        })
        .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
        .run()
    }
    return resultCreate(undefined)
  })
  if (!persistenceResult.success) return persistenceResult

  let mailResult: Result<void>
  try {
    mailResult =
      mail.sendSendOtp === undefined
        ? sendRecipientVerificationError("Verification email delivery failed.", 500, "unknown")
        : await mail.sendSendOtp(email, tokenResult.data)
  } catch {
    mailResult = sendRecipientVerificationError("Verification email delivery failed.", 500, "unknown")
  }
  if (mailResult.success) return mailResult

  const invalidateResult = databaseTransaction(database, () => {
    try {
      database.drizzle
        .delete(sendRecipientVerifications)
        .where(
          and(
            eq(sendRecipientVerifications.sendUuid, sendUuid),
            eq(sendRecipientVerifications.email, email),
            eq(sendRecipientVerifications.otpHash, hashResult.data),
          ),
        )
        .run()
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("sendRecipientVerificationIssue", "Verification state cleanup failed.")
    }
  })
  if (!invalidateResult.success) return invalidateResult
  return sendRecipientVerificationError("Verification email delivery failed.", 500, "unknown")
}

function sendRecipientVerificationRowIsValid(row: SendRecipientVerificationRow): boolean {
  return (
    typeof row.attempts === "number" &&
    Number.isSafeInteger(row.attempts) &&
    row.attempts >= 0 &&
    typeof row.lastSentAt === "string" &&
    typeof row.otpExpiresAt === "string" &&
    typeof row.otpHash === "string" &&
    typeof row.otpSalt === "string" &&
    typeof row.resendCount === "number" &&
    Number.isSafeInteger(row.resendCount) &&
    row.resendCount >= 0
  )
}

function sendRecipientVerificationError(message: string, statusCode: number, sendAccessErrorType: string) {
  return resultErrorCreate("sendRecipientVerificationIssue", message, {
    code:
      statusCode === 429
        ? "platform.rate-limited"
        : statusCode === 500
          ? "platform.internal"
          : "platform.invalid-request",
    errorData: JSON.stringify({ sendAccessErrorType }),
    statusCode,
  })
}
