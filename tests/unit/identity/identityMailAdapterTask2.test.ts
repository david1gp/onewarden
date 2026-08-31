import { expect, test } from "bun:test"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

test("records a rendered envelope for every mail flow, including Send OTP", async () => {
  const mail = identityMailAdapterCreate(clockTestCreate("2026-08-28T00:00:00.000Z"), "https://mail.example")

  await mail.sendRegisterVerifyEmail("user+test@example.com", "registration-token")
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
    "Browser <script>",
    7,
  )
  await mail.sendInvite?.("member@example.com", "Org <script>alert(1)</script>", "member-1", "invite-token")
  await mail.sendInviteAccepted?.("member@example.com", "owner@example.com", "Org")
  await mail.sendInviteConfirmed?.("member@example.com", "Org")
  await mail.sendAdminResetPassword?.("member@example.com", "Member", "Org")
  await mail.sendTest?.("admin@example.com")
  await mail.sendEmergencyAccessInvite?.(
    "grantee@example.com",
    "user-2",
    "emergency-1",
    "Grantor <script>alert(1)</script>",
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

  expect(mail.messages).toHaveLength(26)
  expect(mail.messages.map((message) => message.kind)).toEqual([
    "registerVerify",
    "welcome",
    "welcomeMustVerify",
    "changeEmail",
    "changeEmailInvited",
    "changeEmailExisting",
    "verifyEmail",
    "deleteAccount",
    "passwordHint",
    "sendOtp",
    "twoFactorToken",
    "protectedActionToken",
    "incompleteTwoFactor",
    "invite",
    "inviteAccepted",
    "inviteConfirmed",
    "adminResetPassword",
    "smtpTest",
    "emergencyAccessInvite",
    "emergencyAccessInviteAccepted",
    "emergencyAccessInviteConfirmed",
    "emergencyAccessRecoveryInitiated",
    "emergencyAccessRecoveryApproved",
    "emergencyAccessRecoveryRejected",
    "emergencyAccessRecoveryReminder",
    "emergencyAccessRecoveryTimedOut",
  ])
  for (const message of mail.messages) {
    expect(message.subject.length).toBeGreaterThan(0)
    expect(message.text.length).toBeGreaterThan(0)
    expect(message.html.length).toBeGreaterThan(0)
    expect(message.html).not.toContain("<script>")
  }

  const registration = mail.messages[0]
  if (registration === undefined) throw new Error("registration message missing")
  const registrationUrl = new URL(registration.text.split("Verify Email Address Now: ")[1]?.split("\n")[0] ?? "")
  expect(registrationUrl.origin).toBe("https://mail.example")
  expect(registrationUrl.hash).toContain("email=user%2Btest%40example.com")
  expect(registrationUrl.hash).toContain("token=registration-token")
  expect(registration.html).toContain(
    "https://mail.example/#/finish-signup/?email=user%2Btest%40example.com&amp;token=",
  )

  const hint = mail.messages.find((message) => message.kind === "passwordHint")
  expect(hint?.html).toContain("hint &lt;script&gt;alert(1)&lt;/script&gt;")
  expect(hint?.text).not.toContain("<script>")

  const invite = mail.messages.find((message) => message.kind === "invite")
  expect(invite?.subject).toBe("Join Org <script>alert(1)</script>")
  expect(invite?.html).toContain("Org &lt;script&gt;alert(1)&lt;/script&gt;")
  expect(invite?.html).toContain("https://mail.example/#/accept-organization/?")

  const smtpTest = mail.messages.find((message) => message.kind === "smtpTest")
  expect(smtpTest?.text).toContain("https://mail.example/")
  expect(smtpTest?.html).toContain('href="https://mail.example/"')
})
