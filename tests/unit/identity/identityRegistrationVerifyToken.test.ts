import { expect, test } from "bun:test"
import { SignJWT } from "jose"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identityRegistrationInviteTokenDecode } from "../../../src/server/contexts/identity/identityRegistrationInviteTokenDecode.js"
import { identityRegistrationVerifyTokenCreate } from "../../../src/server/contexts/identity/identityRegistrationVerifyTokenCreate.js"
import { identityRegistrationVerifyTokenDecode } from "../../../src/server/contexts/identity/identityRegistrationVerifyTokenDecode.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import fixtures from "../../fixtures/identityFixtures.json" with { type: "json" }

const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

async function tokenCreate(claims: Record<string, unknown>, privateKey = keyPair.privateKey): Promise<string> {
  return new SignJWT(claims).setProtectedHeader({ typ: "JWT", alg: "RS256" }).sign(privateKey)
}

test("identityRegistrationVerifyTokenCreate emits the exact registration claims", async () => {
  const result = await identityRegistrationVerifyTokenCreate(
    fixtures.verification.email,
    fixtures.verification.name,
    true,
    "https://vault.example",
    keyPair.privateKey,
    clock,
  )

  expect(result.success).toBe(true)
  if (!result.success) return
  const decoded = await identityRegistrationVerifyTokenDecode(
    result.data,
    "https://vault.example",
    keyPair.publicKey,
    clock,
  )
  expect(decoded).toEqual({
    success: true,
    data: {
      nbf: 1787875200,
      exp: 1787877000,
      iss: "https://vault.example|register_verify",
      sub: fixtures.verification.email,
      name: fixtures.verification.name,
      verified: true,
    },
  })
})

test("identityRegistrationVerifyTokenDecode strips whitespace and enforces claims, issuer, signature, and time", async () => {
  const token = await tokenCreate({
    iss: "https://vault.example|register_verify",
    sub: fixtures.verification.email,
    nbf: 1780000000,
    exp: 1780001800,
    name: null,
    verified: false,
  })
  const whitespaceToken = `${token.slice(0, 20)}\n${token.slice(20)}`
  const valid = await identityRegistrationVerifyTokenDecode(
    whitespaceToken,
    "https://vault.example",
    keyPair.publicKey,
    clockTestCreate(1780000000000),
  )
  expect(valid).toMatchObject({ success: true, data: { verified: false, name: null } })

  const wrongIssuer = await identityRegistrationVerifyTokenDecode(
    token,
    "https://other.example",
    keyPair.publicKey,
    clockTestCreate(1780000000000),
  )
  const expired = await identityRegistrationVerifyTokenDecode(
    token,
    "https://vault.example",
    keyPair.publicKey,
    clockTestCreate(1780001831000),
  )
  const immature = await identityRegistrationVerifyTokenDecode(
    token,
    "https://vault.example",
    keyPair.publicKey,
    clockTestCreate(1779999969000),
  )
  const otherKeyResult = rsaKeyPairGenerate()
  expect(otherKeyResult.success).toBe(true)
  if (!otherKeyResult.success) return
  const wrongSignature = await identityRegistrationVerifyTokenDecode(
    token,
    "https://vault.example",
    otherKeyResult.data.publicKey,
    clockTestCreate(1780000000000),
  )

  expect(wrongIssuer).toMatchObject({ success: false, errorMessage: "Issuer is invalid", statusCode: 400 })
  expect(expired).toMatchObject({ success: false, errorMessage: "Token has expired", statusCode: 400 })
  expect(immature).toMatchObject({
    success: false,
    errorMessage: "Error decoding JWT: ImmatureSignature",
    statusCode: 400,
  })
  expect(wrongSignature).toMatchObject({
    success: false,
    errorMessage: "Error decoding JWT: InvalidSignature",
    statusCode: 400,
  })
})

test("identityRegistrationInviteTokenDecode validates organization and emergency invitation claims", async () => {
  const organizationToken = await tokenCreate({
    iss: "https://vault.example|invite",
    sub: "pending-user",
    nbf: 1780000000,
    exp: 1780001800,
    email: fixtures.organizationInvite.email,
    org_id: fixtures.organizationInvite.organizationId,
    member_id: fixtures.organizationInvite.organizationUserId,
    invited_by_email: "owner@example.com",
  })
  const emergencyToken = await tokenCreate({
    iss: "https://vault.example|emergencyaccessinvite",
    sub: "pending-user",
    nbf: 1780000000,
    exp: 1780001800,
    email: fixtures.emergencyInvite.email,
    emer_id: fixtures.emergencyInvite.emergencyAccessId,
    grantor_name: "Grantor",
    grantor_email: "grantor@example.com",
  })
  const malformedSubjectToken = await tokenCreate({
    iss: "https://vault.example|invite",
    sub: 123,
    nbf: 1780000000,
    exp: 1780001800,
    email: fixtures.organizationInvite.email,
    member_id: fixtures.organizationInvite.organizationUserId,
  })

  await expect(
    identityRegistrationInviteTokenDecode(
      organizationToken,
      "organization",
      "https://vault.example",
      keyPair.publicKey,
      clockTestCreate(1780000000000),
    ),
  ).resolves.toEqual({
    success: true,
    data: { email: fixtures.organizationInvite.email, id: fixtures.organizationInvite.organizationUserId },
  })
  await expect(
    identityRegistrationInviteTokenDecode(
      emergencyToken,
      "emergency",
      "https://vault.example",
      keyPair.publicKey,
      clockTestCreate(1780000000000),
    ),
  ).resolves.toEqual({
    success: true,
    data: { email: fixtures.emergencyInvite.email, id: fixtures.emergencyInvite.emergencyAccessId },
  })
  await expect(
    identityRegistrationInviteTokenDecode(
      malformedSubjectToken,
      "organization",
      "https://vault.example",
      keyPair.publicKey,
      clockTestCreate(1780000000000),
    ),
  ).resolves.toMatchObject({ success: false, errorMessage: "Token is invalid", statusCode: 400 })
})
