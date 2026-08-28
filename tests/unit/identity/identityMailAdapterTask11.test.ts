import { expect, test } from "bun:test"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

test("deterministic mail adapter records every lifecycle message with stable fields", async () => {
  const mail = identityMailAdapterCreate(clockTestCreate("2026-08-28T00:00:00.000Z"))

  await mail.sendRegisterVerifyEmail("register@example.com", "123456")
  await mail.sendWelcome("welcome@example.com")
  await mail.sendWelcomeMustVerify("verify@example.com", "user-1", "654321")
  await mail.sendChangeEmail?.("new@example.com", "111111", "user-1")
  await mail.sendChangeEmailInvited?.("invite@example.com", "acting@example.com", "user-1")
  await mail.sendChangeEmailExisting?.("existing@example.com", "acting@example.com", "user-1")
  await mail.sendVerifyEmail?.("verify@example.com", "user-1", "222222")
  await mail.sendDeleteAccount?.("delete@example.com", "user-1", "333333")
  await mail.sendPasswordHint?.("hint@example.com", "a hint")

  expect(mail.messages).toEqual([
    {
      kind: "registerVerify",
      recipient: "register@example.com",
      targetEmail: null,
      timestamp: "2026-08-28T00:00:00.000Z",
      token: "123456",
      userId: null,
    },
    {
      kind: "welcome",
      recipient: "welcome@example.com",
      targetEmail: null,
      timestamp: "2026-08-28T00:00:00.000Z",
      token: null,
      userId: null,
    },
    {
      kind: "welcomeMustVerify",
      recipient: "verify@example.com",
      targetEmail: null,
      timestamp: "2026-08-28T00:00:00.000Z",
      token: "654321",
      userId: "user-1",
    },
    {
      kind: "changeEmail",
      recipient: "new@example.com",
      targetEmail: "new@example.com",
      timestamp: "2026-08-28T00:00:00.000Z",
      token: "111111",
      userId: "user-1",
    },
    {
      actingEmail: "acting@example.com",
      kind: "changeEmailInvited",
      recipient: "invite@example.com",
      targetEmail: "invite@example.com",
      timestamp: "2026-08-28T00:00:00.000Z",
      token: null,
      userId: "user-1",
    },
    {
      actingEmail: "acting@example.com",
      kind: "changeEmailExisting",
      recipient: "existing@example.com",
      targetEmail: "existing@example.com",
      timestamp: "2026-08-28T00:00:00.000Z",
      token: null,
      userId: "user-1",
    },
    {
      kind: "verifyEmail",
      recipient: "verify@example.com",
      targetEmail: null,
      timestamp: "2026-08-28T00:00:00.000Z",
      token: "222222",
      userId: "user-1",
    },
    {
      kind: "deleteAccount",
      recipient: "delete@example.com",
      targetEmail: null,
      timestamp: "2026-08-28T00:00:00.000Z",
      token: "333333",
      userId: "user-1",
    },
    {
      kind: "passwordHint",
      recipient: "hint@example.com",
      targetEmail: null,
      timestamp: "2026-08-28T00:00:00.000Z",
      token: null,
      userId: null,
    },
  ])
})
