import { expect, test } from "bun:test"
import { adminConfigCreate } from "../../../src/server/contexts/admin/adminConfigCreate.js"
import { adminConfigurationAdapterCreate } from "../../../src/server/contexts/admin/adminConfigurationAdapterCreate.js"
import { adminCookieValueResolve } from "../../../src/server/contexts/admin/adminCookieValueResolve.js"
import { adminIssuerResolve } from "../../../src/server/contexts/admin/adminIssuerResolve.js"
import { adminSessionTokenCreate } from "../../../src/server/contexts/admin/adminSessionTokenCreate.js"
import { adminSessionTokenVerify } from "../../../src/server/contexts/admin/adminSessionTokenVerify.js"
import { adminTokenValidate } from "../../../src/server/contexts/admin/adminTokenValidate.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

test("admin token validation is constant-time for plaintext and supports Argon2 PHC tokens", async () => {
  expect(await adminTokenValidate(" secret ", "secret")).toEqual({ success: true, data: true })
  expect(await adminTokenValidate("wrong", "secret")).toEqual({ success: true, data: false })
  const hash = await Bun.password.hash("secret", { algorithm: "argon2id" })
  const hashResult = await adminTokenValidate("secret", hash)
  expect(hashResult.success).toBe(true)
  if (hashResult.success) expect(hashResult.data).toBe(true)
})

test("admin session JWTs enforce issuer, subject, and deterministic expiry", async () => {
  const keyPairResult = rsaKeyPairGenerate()
  expect(keyPairResult.success).toBe(true)
  if (!keyPairResult.success) return
  const clock = clockTestCreate("2026-08-28T12:00:00.000Z")
  const issuer = adminIssuerResolve("https://vault.example", "https://vault.example/admin/")
  const tokenResult = await adminSessionTokenCreate(issuer, keyPairResult.data.privateKey, clock, 1)
  expect(tokenResult.success).toBe(true)
  if (!tokenResult.success) return
  expect((await adminSessionTokenVerify(tokenResult.data, issuer, keyPairResult.data.publicKey, clock)).success).toBe(
    true,
  )
  expect(
    (await adminSessionTokenVerify(` ${tokenResult.data}`, issuer, keyPairResult.data.publicKey, clock)).success,
  ).toBe(false)
  expect(
    (await adminSessionTokenVerify(tokenResult.data, `${issuer}-wrong`, keyPairResult.data.publicKey, clock)).success,
  ).toBe(false)
  const expiredClock = clockTestCreate("2026-08-28T12:02:00.000Z")
  expect(
    (await adminSessionTokenVerify(tokenResult.data, issuer, keyPairResult.data.publicKey, expiredClock)).success,
  ).toBe(false)
})

test("admin cookie parsing and configuration adapters avoid leaking credentials", () => {
  expect(adminCookieValueResolve("other=value; VW_ADMIN=jwt-value; final=value")).toBe("jwt-value")
  expect(adminCookieValueResolve("VW_ADMIN=")).toBeUndefined()

  const adminConfig = adminConfigCreate({ ADMIN_TOKEN: "secret" })
  const identityConfig = identityConfigCreate({
    SSO_CLIENT_SECRET: "sso-secret",
    SSO_AUTHORITY: "https://auth.example",
  })
  const adapter = adminConfigurationAdapterCreate(adminConfig, identityConfig)
  const support = adapter.getSupportJson() as Record<string, unknown>
  expect(support).toMatchObject({ ADMIN_TOKEN: "***", SIGNUPS_ALLOWED: true, SSO_CLIENT_SECRET: "***" })
  expect(support.SSO_AUTHORITY).not.toBe("https://auth.example")
  const prepared = adapter.getPreparedJson() as Array<{
    group: string
    elements: Array<{ name: string; value: unknown; default: unknown }>
  }>
  expect(prepared[0]?.group).toBe("onewarden")
  expect(prepared[0]?.elements.find((element) => element.name === "SIGNUPS_ALLOWED")).toMatchObject({
    name: "SIGNUPS_ALLOWED",
    value: true,
    default: true,
  })
  expect(adapter.update({ SIGNUPS_ALLOWED: false })).toEqual({ success: true, data: undefined })
  expect(identityConfig.SIGNUPS_ALLOWED).toBe(false)
  expect(adapter.update({ SIGNUPS_ALLOWED: "false" })).toMatchObject({ success: false })
  expect(adapter.delete()).toEqual({ success: true, data: undefined })
  expect(identityConfig.SIGNUPS_ALLOWED).toBe(true)
})
