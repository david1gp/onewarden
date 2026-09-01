import { and, eq, gt, lt, sql } from "drizzle-orm"
import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { sendRecipientVerifications } from "../../database/schema/sendRecipientVerifications.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { Send } from "./send.js"
import { sendFindByAccessId } from "./sendFindByAccessId.js"
import { sendIsAccessible } from "./sendIsAccessible.js"
import { sendPasswordVerify } from "./sendPasswordVerify.js"
import { sendRecipientsNormalize } from "./sendRecipientsNormalize.js"
import { sendRecipientVerificationIssue } from "./sendRecipientVerificationIssue.js"
import { sendRegisterAccess } from "./sendRegisterAccess.js"

type SendAccessTokenCreateOptions = {
  config?: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME" | "EMAIL_TOKEN_SIZE">
  email?: string
  mail?: IdentityMailAdapter
  otp?: string
}

export async function sendAccessTokenCreate(
  database: DatabaseConnection,
  accessId: string,
  password: string | undefined,
  ip: string,
  privateKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
  options?: SendAccessTokenCreateOptions,
): Promise<Result<{ accessToken: string; expiresIn: number }>> {
  const sendResult = sendFindByAccessId(database, accessId)
  if (!sendResult.success) return sendAccessTokenError("Send lookup failed.", 404, "send_id_invalid")
  if (sendResult.data === null) return sendAccessTokenError(`Can't find ${accessId}`, 404, "send_id_invalid")
  const send = sendResult.data
  if (send.maxAccessCount !== null && send.accessCount >= send.maxAccessCount)
    return sendAccessTokenError("Send max access reached.", 404, "send_id_invalid")
  if (!sendIsAccessible(send, clock)) return sendAccessTokenError("Send is not accessible.", 404, "send_id_invalid")
  if (send.emails !== null) return sendEmailAccessTokenCreate(database, send, options, privateKey, issuer, clock)
  if (send.passwordHash !== null) {
    if (password === undefined) return sendAccessTokenError("Password required.", 400, "password_hash_b64_required")
    const passwordResult = await sendPasswordVerify(send, password)
    if (!passwordResult.success || !passwordResult.data)
      return sendAccessTokenError(`Invalid password from ${ip}`, 404, "password_hash_b64_invalid")
  }
  if (privateKey === undefined) return resultErrorCreate("sendAccessTokenCreate", "Send token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const tokenResult = await jwtSign({ nbf: now, exp: now + 120, iss: `${issuer}|send`, sub: send.uuid }, privateKey)
  if (!tokenResult.success) return tokenResult
  const accessResult = sendRegisterAccess(database, send, clock)
  if (!accessResult.success) return accessResult
  if (!accessResult.data) return sendAccessTokenError("Send max access reached.", 404, "send_id_invalid")
  return resultCreate({ accessToken: tokenResult.data, expiresIn: 120 })
}

async function sendEmailAccessTokenCreate(
  database: DatabaseConnection,
  send: Send,
  options: SendAccessTokenCreateOptions | undefined,
  privateKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<{ accessToken: string; expiresIn: number }>> {
  const accessOptions = options ?? {}
  const recipientResult = sendRecipientResolve(send.emails, accessOptions.email)
  if (!recipientResult.success) return recipientResult
  const email = recipientResult.data
  if (accessOptions.otp === undefined) {
    if (accessOptions.mail === undefined)
      return sendAccessTokenError("Verification email delivery failed.", 500, "unknown")
    const issueResult = await sendRecipientVerificationIssue(
      database,
      send.uuid,
      email,
      clock,
      accessOptions.config ?? { EMAIL_EXPIRATION_TIME: 600, EMAIL_TOKEN_SIZE: 6 },
      accessOptions.mail,
    )
    if (!issueResult.success) return issueResult
    return sendAccessTokenError("A verification code was sent.", 400, "email_and_otp_required_otp_sent")
  }
  if (privateKey === undefined) return resultErrorCreate("sendAccessTokenCreate", "Send token signing is unavailable.")

  const hashResult = await sendRecipientVerificationOtpHashCreate(database, send.uuid, email, accessOptions.otp)
  if (!hashResult.success) return hashResult
  if (hashResult.data === null) return sendAccessTokenError("Invalid verification code.", 404, "otp_invalid")
  const hash = hashResult.data
  const now = Math.floor(clock.now().getTime() / 1_000)
  const tokenResult = await jwtSign({ nbf: now, exp: now + 120, iss: `${issuer}|send`, sub: send.uuid }, privateKey)
  if (!tokenResult.success) return tokenResult

  let otpInvalid = false
  const accessResult = databaseTransaction(database, () => {
    const consumeResult = sendRecipientVerificationConsume(
      database,
      send.uuid,
      email,
      hash,
      clock,
      accessOptions.config,
    )
    if (!consumeResult.success) return consumeResult
    if (!consumeResult.data) {
      otpInvalid = true
      return resultCreate(undefined)
    }
    const registerResult = sendRegisterAccess(database, send, clock)
    if (!registerResult.success) return registerResult
    if (!registerResult.data) return sendAccessTokenError("Send max access reached.", 404, "send_id_invalid")
    return resultCreate(undefined)
  })
  if (!accessResult.success) return accessResult
  if (otpInvalid) return sendAccessTokenError("Invalid verification code.", 404, "otp_invalid")
  return resultCreate({ accessToken: tokenResult.data, expiresIn: 120 })
}

function sendRecipientResolve(sendEmails: string | null, input: string | undefined): Result<string> {
  if (input === undefined || input.trim() === "")
    return sendAccessTokenError("Email is required.", 400, "email_required")
  const inputResult = sendRecipientsNormalize(input)
  if (!inputResult.success || inputResult.data === null || inputResult.data.includes(","))
    return sendAccessTokenError("Invalid recipient email.", 404, "email_invalid")
  const configuredResult = sendRecipientsNormalize(sendEmails)
  if (!configuredResult.success || configuredResult.data === null)
    return sendAccessTokenError("Invalid recipient email.", 404, "email_invalid")
  const configured = new Set(configuredResult.data.split(","))
  if (!configured.has(inputResult.data)) return sendAccessTokenError("Invalid recipient email.", 404, "email_invalid")
  return resultCreate(inputResult.data)
}

async function sendRecipientVerificationOtpHashCreate(
  database: DatabaseConnection,
  sendUuid: string,
  email: string,
  otp: string,
): Promise<Result<string | null>> {
  const op = "sendRecipientVerificationOtpHashCreate"
  try {
    const row = database.drizzle
      .select({ otpSalt: sendRecipientVerifications.otpSalt })
      .from(sendRecipientVerifications)
      .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
      .limit(1)
      .get()
    if (row === undefined || row.otpSalt.length === 0) return resultCreate(null)
    const hashResult = await sha256Hex(`${row.otpSalt}:${otp}`)
    if (!hashResult.success) return hashResult
    return resultCreate(hashResult.data)
  } catch {
    return resultErrorCreate(op, "Verification code lookup failed.")
  }
}

function sendRecipientVerificationConsume(
  database: DatabaseConnection,
  sendUuid: string,
  email: string,
  hash: string,
  clock: Clock,
  config: SendAccessTokenCreateOptions["config"],
): Result<boolean> {
  try {
    const row = database.drizzle
      .select({
        attempts: sendRecipientVerifications.attempts,
        otpExpiresAt: sendRecipientVerifications.otpExpiresAt,
        otpHash: sendRecipientVerifications.otpHash,
      })
      .from(sendRecipientVerifications)
      .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
      .limit(1)
      .get()
    if (row === undefined) return resultCreate(false)
    const limit = config?.EMAIL_ATTEMPTS_LIMIT ?? 3
    if (!Number.isSafeInteger(row.attempts) || row.attempts < 0 || row.attempts >= limit) {
      database.drizzle
        .delete(sendRecipientVerifications)
        .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
        .run()
      return resultCreate(false)
    }
    const expiresAt = Date.parse(row.otpExpiresAt)
    if (!Number.isFinite(expiresAt) || clock.now().getTime() >= expiresAt) {
      database.drizzle
        .delete(sendRecipientVerifications)
        .where(and(eq(sendRecipientVerifications.sendUuid, sendUuid), eq(sendRecipientVerifications.email, email)))
        .run()
      return resultCreate(false)
    }
    if (!constantTimeStringsEqual(row.otpHash, hash)) {
      database.drizzle
        .update(sendRecipientVerifications)
        .set({ attempts: sql`${sendRecipientVerifications.attempts} + 1` })
        .where(
          and(
            eq(sendRecipientVerifications.sendUuid, sendUuid),
            eq(sendRecipientVerifications.email, email),
            eq(sendRecipientVerifications.otpHash, row.otpHash),
            lt(sendRecipientVerifications.attempts, limit),
          ),
        )
        .run()
      return resultCreate(false)
    }
    const deleteResult = database.drizzle
      .delete(sendRecipientVerifications)
      .where(
        and(
          eq(sendRecipientVerifications.sendUuid, sendUuid),
          eq(sendRecipientVerifications.email, email),
          eq(sendRecipientVerifications.otpHash, hash),
          lt(sendRecipientVerifications.attempts, limit),
          gt(sendRecipientVerifications.otpExpiresAt, clock.now().toISOString()),
        ),
      )
      .returning({ sendUuid: sendRecipientVerifications.sendUuid })
      .all()
    return resultCreate(deleteResult.length === 1)
  } catch {
    return resultErrorCreate("sendRecipientVerificationConsume", "Verification code validation failed.")
  }
}

function sendAccessTokenError(message: string, statusCode: number, sendAccessErrorType: string) {
  return resultErrorCreate("sendAccessTokenCreate", message, {
    code:
      statusCode === 404
        ? "platform.not-found"
        : statusCode === 429
          ? "platform.rate-limited"
          : statusCode === 500
            ? "platform.internal"
            : "platform.invalid-request",
    errorData: JSON.stringify({ sendAccessErrorType }),
    statusCode,
  })
}
