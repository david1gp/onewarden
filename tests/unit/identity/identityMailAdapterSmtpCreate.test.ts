import { expect, test } from "bun:test"
import type { SendMailOptions } from "nodemailer"
import { identityMailAdapterSmtpCreate } from "../../../src/server/contexts/identity/identityMailAdapterSmtpCreate.js"

const smtpConfig = {
  SMTP_FROM: "auth@example.com",
  SMTP_HOST: "smtp.example.com",
  SMTP_PASSWORD: "smtp-secret-password",
  SMTP_PORT: 587,
  SMTP_TIMEOUT: 7,
  SMTP_USERNAME: "auth@example.com",
}

test("sends every rendered envelope through one STARTTLS transport", async () => {
  const sent: SendMailOptions[] = []
  let transportOptions: unknown
  const mail = identityMailAdapterSmtpCreate({
    config: smtpConfig,
    publicOrigin: "https://mail.example",
    transportCreate: (options) => {
      transportOptions = options
      return {
        close: () => undefined,
        sendMail: async (message) => {
          sent.push(message)
          return undefined
        },
      }
    },
  })

  await mail.sendRegisterVerifyEmail("user@example.com", "registration-token")
  await mail.sendWelcome("welcome@example.com")
  await mail.sendWelcomeMustVerify("verify@example.com", "user-1", "welcome-token")
  await mail.sendChangeEmail?.("change@example.com", "change-token", "user-1")
  await mail.sendChangeEmailInvited?.("invited@example.com", "acting@example.com", "user-1")
  await mail.sendChangeEmailExisting?.("existing@example.com", "acting@example.com", "user-1")
  await mail.sendVerifyEmail?.("verify@example.com", "user-1", "verify-token")
  await mail.sendDeleteAccount?.("delete@example.com", "user-1", "delete-token")
  await mail.sendPasswordHint?.("hint@example.com", "hint <script>alert(1)</script>")
  await mail.sendSendOtp?.("send@example.com", "123456")
  await mail.sendTwoFactorToken?.("two-factor@example.com", "234567")
  await mail.sendProtectedActionToken?.("protected@example.com", "345678")
  await mail.sendIncompleteTwoFactorLogin?.(
    "incomplete@example.com",
    "192.0.2.1",
    "2026-08-28T00:00:00.000Z",
    "Browser",
    7,
  )
  await mail.sendInvite?.("member@example.com", "Organization", "member-1", "invite-token")
  await mail.sendInviteAccepted?.("member@example.com", "owner@example.com", "Organization")
  await mail.sendInviteConfirmed?.("member@example.com", "Organization")
  await mail.sendAdminResetPassword?.("member@example.com", "Member", "Organization")
  await mail.sendTest?.("admin@example.com")
  await mail.sendEmergencyAccessInvite?.(
    "grantee@example.com",
    "user-2",
    "emergency-1",
    "Grantor",
    "grantor@example.com",
    "emergency-token",
  )
  await mail.sendEmergencyAccessInviteAccepted?.("grantor@example.com", "grantee@example.com")
  await mail.sendEmergencyAccessInviteConfirmed?.("grantee@example.com", "Grantor")
  await mail.sendEmergencyAccessRecoveryInitiated?.("grantor@example.com", "Grantee", "View", 3)
  await mail.sendEmergencyAccessRecoveryApproved?.("grantee@example.com", "Grantor")
  await mail.sendEmergencyAccessRecoveryRejected?.("grantee@example.com", "Grantor")
  await mail.sendEmergencyAccessRecoveryReminder?.("grantor@example.com", "Grantee", "View", "1")
  await mail.sendEmergencyAccessRecoveryTimedOut?.("grantor@example.com", "Grantee", "View")

  expect(sent).toHaveLength(26)
  expect(sent.map((message) => message.to)).toEqual([
    "user@example.com",
    "welcome@example.com",
    "verify@example.com",
    "change@example.com",
    "invited@example.com",
    "existing@example.com",
    "verify@example.com",
    "delete@example.com",
    "hint@example.com",
    "send@example.com",
    "two-factor@example.com",
    "protected@example.com",
    "incomplete@example.com",
    "member@example.com",
    "owner@example.com",
    "member@example.com",
    "member@example.com",
    "admin@example.com",
    "grantee@example.com",
    "grantor@example.com",
    "grantee@example.com",
    "grantor@example.com",
    "grantee@example.com",
    "grantee@example.com",
    "grantor@example.com",
    "grantor@example.com",
  ])
  for (const message of sent) {
    expect(message.from).toBe("auth@example.com")
    expect(message.subject).toBeString()
    expect(message.text).toBeString()
    expect(message.html).toBeString()
  }
  expect(sent[0]?.text).toContain("registration-token")
  expect(sent[17]?.text).toContain("https://mail.example/")
  expect(transportOptions).toMatchObject({
    auth: { pass: "smtp-secret-password", user: "auth@example.com" },
    connectionTimeout: 7_000,
    dnsTimeout: 7_000,
    greetingTimeout: 7_000,
    host: "smtp.example.com",
    ignoreTLS: false,
    port: 587,
    requireTLS: true,
    secure: false,
    socketTimeout: 7_000,
    tls: { rejectUnauthorized: true, servername: "smtp.example.com" },
  })
  expect(mail.messages).toBeUndefined()
})

test("returns safe delivery errors and closes an SMTP transport once", async () => {
  let closeCount = 0
  const mail = identityMailAdapterSmtpCreate({
    config: smtpConfig,
    transport: {
      close: () => {
        closeCount += 1
      },
      sendMail: async () => {
        throw new Error("smtp password smtp-secret-password leaked")
      },
    },
  })

  const sendResult = await mail.sendTwoFactorToken?.("user@example.com", "token-value")
  expect(sendResult).toMatchObject({ success: false, errorMessage: "SMTP mail delivery failed." })
  if (sendResult?.success === false) expect(sendResult.errorMessage).not.toContain("smtp-secret-password")

  const firstCloseResult = await mail.close?.()
  const secondCloseResult = await mail.close?.()
  expect(firstCloseResult?.success).toBe(true)
  expect(secondCloseResult?.success).toBe(true)
  expect(closeCount).toBe(1)
  const closedResult = await mail.sendWelcome("user@example.com")
  expect(closedResult).toMatchObject({ success: false, errorMessage: "SMTP mail transport is closed." })
})

test("bounds a stalled SMTP send and closes the active transport", async () => {
  let closeCount = 0
  const mail = identityMailAdapterSmtpCreate({
    config: { ...smtpConfig, SMTP_TIMEOUT: 1 },
    transport: {
      close: () => {
        closeCount += 1
      },
      sendMail: () => new Promise<unknown>(() => undefined),
    },
  })

  const result = await mail.sendWelcome("user@example.com")

  expect(result).toMatchObject({ success: false, errorMessage: "SMTP mail delivery failed." })
  expect(closeCount).toBe(1)
})
