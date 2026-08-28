import { expect, test } from "bun:test"
import { sendIsAccessible } from "../../../src/server/contexts/sends/sendIsAccessible.js"
import { sendPasswordSet } from "../../../src/server/contexts/sends/sendPasswordSet.js"
import { sendPasswordVerify } from "../../../src/server/contexts/sends/sendPasswordVerify.js"
import type { Send } from "../../../src/server/contexts/sends/send.js"
import { sendToJson } from "../../../src/server/contexts/sends/sendToJson.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const date = "2026-08-28T00:00:00.000Z"

function sendCreate(overrides?: Partial<Send>): Send {
  return {
    uuid: "send-one",
    userUuid: "user-one",
    organizationUuid: null,
    name: "A Send",
    notes: "notes",
    type: 0,
    data: JSON.stringify({ Text: "secret", response: "removed" }),
    key: "encrypted-key",
    passwordHash: null,
    passwordSalt: null,
    passwordIterations: null,
    maxAccessCount: null,
    accessCount: 0,
    creationDate: date,
    revisionDate: date,
    expirationDate: null,
    deletionDate: "2026-09-01T00:00:00.000Z",
    disabled: false,
    hideEmail: false,
    ...overrides,
  }
}

test("Send owner JSON normalizes data and exposes the upstream access fields", () => {
  const result = sendToJson(sendCreate())

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toMatchObject({
    accessCount: 0,
    authType: 2,
    hideEmail: false,
    name: "A Send",
    object: "send",
    password: null,
    text: { text: "secret" },
    type: 0,
  })
  expect(result.data.accessId).toBeDefined()
})

test("Send password hashing uses the Vaultwarden-compatible 100000-iteration PBKDF2 format", async () => {
  const result = await sendPasswordSet(sendCreate(), "secret-password")

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.passwordHash?.byteLength).toBe(32)
  expect(result.data.passwordSalt?.byteLength).toBe(64)
  expect(result.data.passwordIterations).toBe(100_000)
  const validResult = await sendPasswordVerify(result.data, "secret-password")
  const invalidResult = await sendPasswordVerify(result.data, "wrong")
  expect(validResult.success && validResult.data).toBe(true)
  expect(invalidResult.success && invalidResult.data).toBe(false)
})

test("Send accessibility rejects disabled, expired, and deletion-expired sends", () => {
  const clock = clockTestCreate(date)

  expect(sendIsAccessible(sendCreate(), clock)).toBe(true)
  expect(sendIsAccessible(sendCreate({ disabled: true }), clock)).toBe(false)
  expect(sendIsAccessible(sendCreate({ expirationDate: date }), clock)).toBe(false)
  expect(sendIsAccessible(sendCreate({ deletionDate: date }), clock)).toBe(false)
})
