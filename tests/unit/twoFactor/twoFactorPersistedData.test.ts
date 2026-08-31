import { expect, test } from "bun:test"
import * as v from "valibot"
import { twoFactorDuoDataSchema } from "../../../src/server/contexts/twoFactor/twoFactorDuoDataSchema.js"
import { twoFactorEmailDataSchema } from "../../../src/server/contexts/twoFactor/twoFactorEmailDataSchema.js"
import { twoFactorProtectedActionDataSchema } from "../../../src/server/contexts/twoFactor/twoFactorProtectedActionDataSchema.js"
import { twoFactorPersistedJsonParse } from "../../../src/server/contexts/twoFactor/twoFactorPersistedJsonParse.js"
import { twoFactorWebAuthnRegistrationsSchema } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnRegistrationsSchema.js"
import { twoFactorWebAuthnStateSchema } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnStateSchema.js"
import { twoFactorWebAuthnU2fDataSchema } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnU2fDataSchema.js"
import { twoFactorYubikeyDataSchema } from "../../../src/server/contexts/twoFactor/twoFactorYubikeyDataSchema.js"

test("two-factor persisted schemas accept current and legacy-compatible values", () => {
  expect(
    v.safeParse(twoFactorEmailDataSchema, {
      attempts: 0,
      email: "user@example.com",
      last_token: null,
      token_sent: 1_756_358_400,
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(twoFactorProtectedActionDataSchema, { attempts: 0, token: "123456", token_sent: 1_756_358_400 })
      .success,
  ).toBe(true)
  expect(v.safeParse(twoFactorDuoDataSchema, { host: " host ", ik: " id ", sk: " secret " }).success).toBe(true)
  expect(v.safeParse(twoFactorYubikeyDataSchema, { Keys: ["abcdefghijkl"], Nfc: false })).toMatchObject({
    success: true,
    output: { keys: ["abcdefghijkl"], nfc: false },
  })
  expect(
    v.safeParse(twoFactorWebAuthnRegistrationsSchema, [
      {
        credential: { counter: 0, id: "credential-id", publicKey: "public-key" },
        id: 1,
        name: "Security key",
      },
    ]).success,
  ).toBe(true)
  expect(
    v.safeParse(twoFactorWebAuthnStateSchema, {
      challenge: "challenge",
      credentialIds: ["credential-id"],
      expiresAt: 1_756_358_400,
      kind: "login",
      origin: "https://vault.example",
      rpId: "vault.example",
      userUuid: "user-uuid",
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(twoFactorWebAuthnU2fDataSchema, [
      {
        counter: 0,
        id: 1,
        name: "Legacy key",
        reg: {
          keyHandle: [1, 2, 3],
          pubKey: [4, ...Array.from({ length: 64 }, () => 1)],
        },
      },
    ]).success,
  ).toBe(true)
})

test("two-factor persisted schemas reject malformed security-sensitive values", () => {
  expect(
    v.safeParse(twoFactorEmailDataSchema, {
      attempts: -1,
      email: "user@example.com",
      last_token: 123,
      token_sent: Number.MAX_SAFE_INTEGER + 1,
    }).success,
  ).toBe(false)
  expect(v.safeParse(twoFactorProtectedActionDataSchema, { attempts: 0, token_sent: 1 }).success).toBe(false)
  expect(v.safeParse(twoFactorDuoDataSchema, { host: " ", ik: "id", sk: "secret" }).success).toBe(false)
  expect(v.safeParse(twoFactorYubikeyDataSchema, { keys: [1], nfc: false }).success).toBe(false)
  expect(
    v.safeParse(twoFactorWebAuthnRegistrationsSchema, [
      { id: 1, name: "First", credentialId: "same" },
      { id: 1, name: "Duplicate", credentialId: "same" },
    ]).success,
  ).toBe(false)
  expect(
    v.safeParse(twoFactorWebAuthnStateSchema, {
      challenge: "challenge",
      credentialIds: ["credential-id"],
      credentials: [{ counter: -1, id: "credential-id" }],
      expiresAt: 1_756_358_400,
      kind: "login",
      origin: "https://vault.example",
      rpId: "vault.example",
      userUuid: "user-uuid",
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(twoFactorWebAuthnU2fDataSchema, [
      {
        counter: -1,
        id: 1,
        name: "Legacy key",
        reg: { keyHandle: [1], pubKey: [4] },
      },
    ]).success,
  ).toBe(false)
})

test("persisted JSON decoding returns Result failures instead of throwing", () => {
  expect(
    twoFactorPersistedJsonParse(
      "twoFactorEmailDataRead",
      JSON.stringify({ attempts: 0, email: "user@example.com", last_token: null, token_sent: 1 }),
      twoFactorEmailDataSchema,
      "Email token data is invalid",
    ),
  ).toMatchObject({ success: true })
  expect(
    twoFactorPersistedJsonParse(
      "twoFactorEmailDataRead",
      "not-json",
      twoFactorEmailDataSchema,
      "Email token data is invalid",
    ),
  ).toEqual({ success: false, op: "twoFactorEmailDataRead", errorMessage: "Email token data is invalid" })
})
