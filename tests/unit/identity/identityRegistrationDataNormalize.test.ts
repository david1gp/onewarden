import { expect, test } from "bun:test"
import * as v from "valibot"
import fixtures from "../../fixtures/identityFixtures.json" with { type: "json" }
import { identityRegistrationDataNormalize } from "../../../src/server/contexts/identity/identityRegistrationDataNormalize.js"
import { identityRegistrationDataSchema } from "../../../src/server/contexts/identity/identityRegistrationDataSchema.js"

function registrationData(value: unknown) {
  const result = v.safeParse(identityRegistrationDataSchema, value)
  expect(result.success).toBe(true)
  if (!result.success) throw new Error(v.summarize(result.issues))
  return result.output
}

test("identityRegistrationDataNormalize preserves the legacy RegisterData contract and aliases", () => {
  const result = identityRegistrationDataNormalize(registrationData(fixtures.legacyAliases))

  expect(result).toEqual({
    success: true,
    data: {
      email: "legacy@example.com",
      passwordHash: "legacy-alias-password-hash",
      key: "legacy-alias-key",
      kdf: 0,
      kdfIterations: 100000,
      kdfMemory: null,
      kdfParallelism: null,
      passwordHint: null,
      name: null,
      organizationUserId: null,
      emailVerificationToken: null,
      acceptEmergencyAccessId: null,
      acceptEmergencyAccessInviteToken: null,
      orgInviteToken: "legacy-alias-invite-token",
      keys: {
        encryptedPrivateKey: "legacy-alias-encrypted-private-key",
        publicKey: "legacy-alias-public-key",
      },
      currentFormat: false,
      currentAuthenticationSalt: null,
      currentUnlockSalt: null,
      currentUnlockKdf: null,
    },
  })
})

test("identityRegistrationDataNormalize extracts the current nested authentication and unlock contract", () => {
  const result = identityRegistrationDataNormalize(registrationData(fixtures.currentRegistration))

  expect(result).toMatchObject({
    success: true,
    data: {
      email: "current@example.com",
      passwordHash: "current-client-password-hash",
      key: "current-wrapped-user-key",
      kdf: 0,
      kdfIterations: 100000,
      kdfMemory: null,
      kdfParallelism: null,
      currentFormat: true,
      currentAuthenticationSalt: "current@example.com",
      currentUnlockSalt: "current@example.com",
      currentUnlockKdf: {
        kdf: 0,
        kdfIterations: 100000,
        kdfMemory: null,
        kdfParallelism: null,
      },
    },
  })
})

test("identityRegistrationDataNormalize rejects incomplete and mismatched current RegisterData", () => {
  const incomplete = { ...fixtures.currentRegistration, masterPasswordUnlock: undefined }
  const incompleteResult = identityRegistrationDataNormalize(registrationData(incomplete))
  expect(incompleteResult).toMatchObject({ success: false, errorMessage: "Unexpected RegisterData format" })

  const mismatched = structuredClone(fixtures.currentRegistration)
  mismatched.masterPasswordUnlock.kdf.kdfIterations = 200000
  const mismatchedResult = identityRegistrationDataNormalize(registrationData(mismatched))
  expect(mismatchedResult).toMatchObject({ success: true, data: { currentUnlockKdf: { kdfIterations: 200000 } } })
})

test("identityRegistrationDataNormalize rejects a payload without either RegisterData format", () => {
  const result = identityRegistrationDataNormalize(registrationData({ email: "missing@example.com" }))

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Unexpected RegisterData format",
    code: "identity.unprocessable",
    statusCode: 422,
  })
})
