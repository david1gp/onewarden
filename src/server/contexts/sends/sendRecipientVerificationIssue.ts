import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import { twoFactorEmailTokenCreate } from "../twoFactor/twoFactorEmailTokenCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"

const sendRecipientVerificationResendCooldownSeconds = 30
const sendRecipientVerificationResendLimit = 5

type SendRecipientVerificationRow = {
  attempts: number
  last_sent_at: string
  otp_expires_at: string
  otp_hash: string
  otp_salt: string
  resend_count: number
}

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
    const row = database
      .query<SendRecipientVerificationRow, [string, string]>(
        `SELECT attempts, last_sent_at, otp_expires_at, otp_hash, otp_salt, resend_count
         FROM send_recipient_verifications WHERE send_uuid = ? AND email = ? LIMIT 1`,
      )
      .get(sendUuid, email)

    if (row !== null && sendRecipientVerificationRowIsValid(row)) {
      const lastSentAt = Date.parse(row.last_sent_at)
      if (!Number.isFinite(lastSentAt)) {
        database.run("DELETE FROM send_recipient_verifications WHERE send_uuid = ? AND email = ?", [sendUuid, email])
      } else {
        if (row.resend_count >= sendRecipientVerificationResendLimit)
          return sendRecipientVerificationError("Too many verification code requests.", 429, "rate_limited")
        if (nowTimestamp < lastSentAt + sendRecipientVerificationResendCooldownSeconds * 1_000)
          return sendRecipientVerificationError(
            "Please wait before requesting another verification code.",
            429,
            "rate_limited",
          )
      }
    } else if (row !== null) {
      database.run("DELETE FROM send_recipient_verifications WHERE send_uuid = ? AND email = ?", [sendUuid, email])
    }

    if (row === null || !sendRecipientVerificationRowIsValid(row)) {
      database.run(
        `INSERT INTO send_recipient_verifications
         (send_uuid, email, otp_hash, otp_salt, otp_expires_at, attempts, last_sent_at, resend_count)
         VALUES (?, ?, ?, ?, ?, 0, ?, 0)`,
        [sendUuid, email, hashResult.data, salt, expiresAt, now.toISOString()],
      )
    } else {
      database.run(
        `UPDATE send_recipient_verifications
         SET otp_hash = ?, otp_salt = ?, otp_expires_at = ?, attempts = 0,
             last_sent_at = ?, resend_count = resend_count + 1
         WHERE send_uuid = ? AND email = ?`,
        [hashResult.data, salt, expiresAt, now.toISOString(), sendUuid, email],
      )
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
      database.run("DELETE FROM send_recipient_verifications WHERE send_uuid = ? AND email = ? AND otp_hash = ?", [
        sendUuid,
        email,
        hashResult.data,
      ])
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
    typeof row.last_sent_at === "string" &&
    typeof row.otp_expires_at === "string" &&
    typeof row.otp_hash === "string" &&
    typeof row.otp_salt === "string" &&
    typeof row.resend_count === "number" &&
    Number.isSafeInteger(row.resend_count) &&
    row.resend_count >= 0
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
