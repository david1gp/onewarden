import { expect, test } from "bun:test"
import { SignJWT } from "jose"
import { identityDeleteAccountTokenCreate } from "../../../src/server/contexts/identity/identityDeleteAccountTokenCreate.js"
import { identityDeleteAccountTokenDecode } from "../../../src/server/contexts/identity/identityDeleteAccountTokenDecode.js"
import { identityVerifyEmailTokenCreate } from "../../../src/server/contexts/identity/identityVerifyEmailTokenCreate.js"
import { identityVerifyEmailTokenDecode } from "../../../src/server/contexts/identity/identityVerifyEmailTokenDecode.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

async function tokenCreate(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT(claims).setProtectedHeader({ typ: "JWT", alg: "RS256" }).sign(keyPair.privateKey)
}

test("lifecycle token creators emit exact issuer, subject, and time claims", async () => {
  const verifyResult = await identityVerifyEmailTokenCreate(
    "user-uuid",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    120,
  )
  const deleteResult = await identityDeleteAccountTokenCreate(
    "user-uuid",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    120,
  )

  expect(verifyResult.success).toBe(true)
  expect(deleteResult.success).toBe(true)
  if (!verifyResult.success || !deleteResult.success) return
  await expect(
    identityVerifyEmailTokenDecode(verifyResult.data, "https://vault.example", keyPair.publicKey, clock),
  ).resolves.toEqual({
    success: true,
    data: {
      nbf: 1787875200,
      exp: 1788307200,
      iss: "https://vault.example|verifyemail",
      sub: "user-uuid",
    },
  })
  await expect(
    identityDeleteAccountTokenDecode(deleteResult.data, "https://vault.example", keyPair.publicKey, clock),
  ).resolves.toEqual({
    success: true,
    data: {
      nbf: 1787875200,
      exp: 1788307200,
      iss: "https://vault.example|delete",
      sub: "user-uuid",
    },
  })
})

test("lifecycle token decoders enforce issuer, signature, required claims, and leeway", async () => {
  const token = await tokenCreate({
    iss: "https://vault.example|verifyemail",
    sub: "user-uuid",
    nbf: 1787875200,
    exp: 1787878800,
  })
  const otherKeyResult = rsaKeyPairGenerate()
  expect(otherKeyResult.success).toBe(true)
  if (!otherKeyResult.success) return

  const wrongIssuer = await identityVerifyEmailTokenDecode(token, "https://other.example", keyPair.publicKey, clock)
  const wrongSignature = await identityVerifyEmailTokenDecode(
    token,
    "https://vault.example",
    otherKeyResult.data.publicKey,
    clock,
  )
  const missingClaim = await identityVerifyEmailTokenDecode(
    await tokenCreate({ iss: "https://vault.example|verifyemail", sub: "user-uuid", exp: 1787878800 }),
    "https://vault.example",
    keyPair.publicKey,
    clock,
  )
  const deleteWrongIssuer = await identityDeleteAccountTokenDecode(
    token,
    "https://vault.example",
    keyPair.publicKey,
    clock,
  )

  expect(wrongIssuer).toMatchObject({ success: false, errorMessage: "Invalid claim" })
  expect(wrongSignature).toMatchObject({ success: false, errorMessage: "Invalid claim" })
  expect(missingClaim).toMatchObject({ success: false, errorMessage: "Invalid claim" })
  expect(deleteWrongIssuer).toMatchObject({ success: false, errorMessage: "Invalid claim" })
})
