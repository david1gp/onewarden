import * as nodemailer from "nodemailer"
import type { SendMailOptions } from "nodemailer"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { ServerConfig } from "../../config/serverConfigSchema.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import { identityMailEnvelopeRender } from "./identityMailEnvelopeRender.js"

type IdentityMailSmtpConfig = {
  from: string
  host: string
  password: string
  port: number
  timeoutMilliseconds: number
  username: string
}

type IdentityMailSmtpTransportOptions = {
  auth: { pass: string; user: string }
  connectionTimeout: number
  dnsTimeout: number
  greetingTimeout: number
  host: string
  ignoreTLS: false
  port: number
  requireTLS: true
  secure: false
  socketTimeout: number
  tls: { rejectUnauthorized: true; servername: string }
}

type IdentityMailSmtpTransport = {
  close: () => void
  sendMail: (options: SendMailOptions) => Promise<unknown>
}

type IdentityMailAdapterSmtpCreateOptions = {
  config: Pick<
    ServerConfig,
    "SMTP_FROM" | "SMTP_HOST" | "SMTP_PASSWORD" | "SMTP_PORT" | "SMTP_TIMEOUT" | "SMTP_USERNAME"
  >
  publicOrigin?: string
  transport?: IdentityMailSmtpTransport
  transportCreate?: (options: IdentityMailSmtpTransportOptions) => IdentityMailSmtpTransport
}

export function identityMailAdapterSmtpCreate(options: IdentityMailAdapterSmtpCreateOptions): IdentityMailAdapter {
  const smtpConfig = identityMailSmtpConfigResolve(options.config)
  const transportOptions = smtpConfig === undefined ? undefined : identityMailSmtpTransportOptionsCreate(smtpConfig)
  let transport: IdentityMailSmtpTransport | undefined = options.transport
  let transportInitializationFailed = false
  if (transport === undefined && transportOptions !== undefined) {
    try {
      transport =
        options.transportCreate === undefined
          ? identityMailSmtpTransportCreate(transportOptions)
          : options.transportCreate(transportOptions)
    } catch {
      transportInitializationFailed = true
    }
  }

  let closed = false
  const send = async (input: Parameters<typeof identityMailEnvelopeRender>[0]): Promise<Result<void>> => {
    const op = "identityMailAdapterSmtpSend"
    if (closed) return resultErrorCreate(op, "SMTP mail transport is closed.")
    if (smtpConfig === undefined) return resultErrorCreate(op, "SMTP configuration is incomplete.")
    if (transportInitializationFailed || transport === undefined)
      return resultErrorCreate(op, "SMTP mail transport is unavailable.")
    const envelope = identityMailEnvelopeRender(input, options.publicOrigin)
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    try {
      await Promise.race([
        transport.sendMail({
          disableFileAccess: true,
          disableUrlAccess: true,
          from: smtpConfig.from,
          html: envelope.html,
          subject: envelope.subject,
          text: envelope.text,
          to: envelope.recipient,
        }),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            timedOut = true
            reject(new Error("SMTP delivery timed out."))
          }, smtpConfig.timeoutMilliseconds)
        }),
      ])
    } catch {
      if (timedOut) {
        try {
          transport.close()
        } catch {
          // The original delivery failure is the safe error returned to the caller.
        }
      }
      return resultErrorCreate(op, "SMTP mail delivery failed.")
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
    return resultCreate(undefined)
  }

  const close = async (): Promise<Result<void>> => {
    const op = "identityMailAdapterSmtpClose"
    if (closed) return resultCreate(undefined)
    closed = true
    if (transport === undefined) return resultCreate(undefined)
    try {
      transport.close()
    } catch {
      return resultErrorCreate(op, "SMTP mail transport could not be closed.")
    }
    return resultCreate(undefined)
  }

  return {
    close,
    sendRegisterVerifyEmail: (email, token) => send({ kind: "registerVerify", recipient: email, token }),
    sendWelcome: (email) => send({ kind: "welcome", recipient: email }),
    sendWelcomeMustVerify: (email, userId, token) =>
      send({ kind: "welcomeMustVerify", recipient: email, token: token ?? null, userId }),
    sendChangeEmail: (email, token, userId) =>
      send({ kind: "changeEmail", recipient: email, targetEmail: email, token, userId: userId ?? null }),
    sendChangeEmailInvited: (email, actingEmail, userId) =>
      send({ actingEmail, kind: "changeEmailInvited", recipient: email, targetEmail: email, userId: userId ?? null }),
    sendChangeEmailExisting: (email, actingEmail, userId) =>
      send({ actingEmail, kind: "changeEmailExisting", recipient: email, targetEmail: email, userId: userId ?? null }),
    sendVerifyEmail: (email, userId, token) =>
      send({ kind: "verifyEmail", recipient: email, token: token ?? null, userId }),
    sendDeleteAccount: (email, userId, token) =>
      send({ kind: "deleteAccount", recipient: email, token: token ?? null, userId }),
    sendPasswordHint: (email, hint) => send({ hint: hint ?? "", kind: "passwordHint", recipient: email }),
    sendSendOtp: (email, token) => send({ kind: "sendOtp", recipient: email, token }),
    sendTwoFactorToken: (email, token) => send({ kind: "twoFactorToken", recipient: email, token }),
    sendProtectedActionToken: (email, token) => send({ kind: "protectedActionToken", recipient: email, token }),
    sendIncompleteTwoFactorLogin: (email, ipAddress, loginTime, deviceName, deviceType) =>
      send({ deviceName, deviceType, ipAddress, kind: "incompleteTwoFactor", loginTime, recipient: email }),
    sendInvite: (email, organizationName, memberId, token) =>
      send({ kind: "invite", organizationName, recipient: email, targetEmail: memberId, token: token ?? null }),
    sendInviteAccepted: (newUserEmail, address, organizationName) =>
      send({ kind: "inviteAccepted", organizationName, recipient: address, targetEmail: newUserEmail }),
    sendInviteConfirmed: (address, organizationName) =>
      send({ kind: "inviteConfirmed", organizationName, recipient: address }),
    sendAdminResetPassword: (email, userName, organizationName) =>
      send({ kind: "adminResetPassword", organizationName, recipient: email, userName }),
    sendTest: (email) => send({ kind: "smtpTest", recipient: email }),
    sendEmergencyAccessInvite: (email, userId, emergencyAccessId, grantorName, grantorEmail, token) =>
      send({
        actingEmail: grantorEmail,
        grantorName,
        kind: "emergencyAccessInvite",
        recipient: email,
        targetEmail: emergencyAccessId,
        token,
        userId,
      }),
    sendEmergencyAccessInviteAccepted: (email, granteeEmail) =>
      send({ kind: "emergencyAccessInviteAccepted", recipient: email, targetEmail: granteeEmail }),
    sendEmergencyAccessInviteConfirmed: (email, grantorName) =>
      send({ actingEmail: grantorName, kind: "emergencyAccessInviteConfirmed", recipient: email }),
    sendEmergencyAccessRecoveryInitiated: (email, granteeName, type, waitTimeDays) =>
      send({
        actingEmail: granteeName,
        kind: "emergencyAccessRecoveryInitiated",
        recipient: email,
        targetEmail: `${type}:${waitTimeDays}`,
        type,
        waitTimeDays,
      }),
    sendEmergencyAccessRecoveryApproved: (email, grantorName) =>
      send({ actingEmail: grantorName, kind: "emergencyAccessRecoveryApproved", recipient: email }),
    sendEmergencyAccessRecoveryRejected: (email, grantorName) =>
      send({ actingEmail: grantorName, kind: "emergencyAccessRecoveryRejected", recipient: email }),
    sendEmergencyAccessRecoveryReminder: (email, granteeName, type, daysLeft) =>
      send({
        actingEmail: granteeName,
        daysLeft,
        kind: "emergencyAccessRecoveryReminder",
        recipient: email,
        targetEmail: `${type}:${daysLeft}`,
        type,
      }),
    sendEmergencyAccessRecoveryTimedOut: (email, granteeName, type) =>
      send({
        actingEmail: granteeName,
        kind: "emergencyAccessRecoveryTimedOut",
        recipient: email,
        targetEmail: type,
        type,
      }),
  }
}

function identityMailSmtpConfigResolve(
  config: IdentityMailAdapterSmtpCreateOptions["config"],
): IdentityMailSmtpConfig | undefined {
  if (
    config.SMTP_FROM === undefined ||
    config.SMTP_HOST === undefined ||
    config.SMTP_PASSWORD === undefined ||
    config.SMTP_USERNAME === undefined ||
    config.SMTP_FROM.length === 0 ||
    config.SMTP_HOST.length === 0 ||
    config.SMTP_PASSWORD.length === 0 ||
    config.SMTP_USERNAME.length === 0
  )
    return undefined
  const port = config.SMTP_PORT ?? 587
  const timeoutSeconds = config.SMTP_TIMEOUT ?? 15
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) return undefined
  if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 120) return undefined
  return {
    from: config.SMTP_FROM,
    host: config.SMTP_HOST,
    password: config.SMTP_PASSWORD,
    port,
    timeoutMilliseconds: timeoutSeconds * 1_000,
    username: config.SMTP_USERNAME,
  }
}

function identityMailSmtpTransportOptionsCreate(config: IdentityMailSmtpConfig): IdentityMailSmtpTransportOptions {
  return {
    auth: { pass: config.password, user: config.username },
    connectionTimeout: config.timeoutMilliseconds,
    dnsTimeout: config.timeoutMilliseconds,
    greetingTimeout: config.timeoutMilliseconds,
    host: config.host,
    ignoreTLS: false,
    port: config.port,
    requireTLS: true,
    secure: false,
    socketTimeout: config.timeoutMilliseconds,
    tls: { rejectUnauthorized: true, servername: config.host },
  }
}

function identityMailSmtpTransportCreate(options: IdentityMailSmtpTransportOptions): IdentityMailSmtpTransport {
  const transport = nodemailer.createTransport(options)
  return {
    close: () => transport.close(),
    sendMail: (mailOptions) => transport.sendMail(mailOptions),
  }
}
