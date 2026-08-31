import { expect, test } from "bun:test"
import { twoFactorAdaptersCreate } from "../../../src/server/contexts/twoFactor/twoFactorAdaptersCreate.js"
import { extensionPasskeyAssertionCreate } from "../../../src/extension/passkey/extensionPasskeyAssertionCreate.js"
import { extensionPasskeyCredentialCreate } from "../../../src/extension/passkey/extensionPasskeyCredentialCreate.js"
import { extensionPasskeyCredentialIdDecode } from "../../../src/extension/passkey/extensionPasskeyCredentialIdDecode.js"
import { extensionBackgroundServiceCreate } from "../../../src/extension/background/extensionBackgroundServiceCreate.js"
import { extensionFido2CredentialDecrypt } from "../../../src/extension/crypto/extensionFido2CredentialDecrypt.js"
import { extensionFido2CredentialEncrypt } from "../../../src/extension/crypto/extensionFido2CredentialEncrypt.js"
import { extensionCoseP256PublicKeyEncode } from "../../../src/extension/passkey/extensionCoseP256PublicKeyEncode.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenSyncEnvelope } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"

const origin = "https://example.test"
const rpId = "example.test"
const userId = base64UrlEncode(Uint8Array.from([1, 2, 3, 4, 5]))
const vaultKey = Uint8Array.from({ length: 64 }, (_, index) => index)

function clientDataCreate(type: "webauthn.create" | "webauthn.get", challenge: string): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify({ type, challenge, origin, crossOrigin: false })))
}

test("extension passkey registration emits Bitwarden-compatible none attestation and verifies independently", async () => {
  const challenge = base64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => index))
  const registrationResult = await extensionPasskeyCredentialCreate(
    {
      rpId,
      rpName: "Example",
      userId,
      userName: "alice@example.test",
      userDisplayName: "Alice",
      clientDataJSON: clientDataCreate("webauthn.create", challenge),
      requireResidentKey: true,
      residentKey: "required",
      userVerification: "discouraged",
      excludeCredentialIds: [],
    },
    false,
    () => Date.parse("2026-08-31T00:00:00.000Z"),
  )
  expect(registrationResult.success).toBe(true)
  if (!registrationResult.success) return
  expect(registrationResult.data.credential).toMatchObject({
    keyType: "public-key",
    keyAlgorithm: "ECDSA",
    keyCurve: "P-256",
    rpId,
    counter: 0,
    discoverable: true,
  })
  const encryptedCredentialResult = await extensionFido2CredentialEncrypt(registrationResult.data.credential, vaultKey)
  expect(encryptedCredentialResult.success).toBe(true)
  if (!encryptedCredentialResult.success) return
  expect(encryptedCredentialResult.data.keyValue.startsWith("2.")).toBe(true)
  expect(await extensionFido2CredentialDecrypt(encryptedCredentialResult.data, vaultKey)).toEqual({
    success: true,
    data: registrationResult.data.credential,
  })
  expect(registrationResult.data.response.response.transports).toEqual(["internal"])
  expect(registrationResult.data.response.response.attestationObject).toMatch(/^[A-Za-z0-9_-]+$/u)

  const discoveredAssertion = await extensionPasskeyAssertionCreate(
    {
      rpId,
      clientDataJSON: clientDataCreate("webauthn.get", challenge),
    },
    [registrationResult.data.credential],
  )
  expect(discoveredAssertion.success).toBe(true)

  const verifyResult = await twoFactorAdaptersCreate().webauthn?.registrationValidate?.(
    registrationResult.data.response,
    {
      challenge,
      credentialIds: [],
      expiresAt: 4_000_000_000,
      kind: "registration",
      origin,
      rpId,
      userUuid: "test-user",
    },
  )
  expect(verifyResult?.success).toBe(true)
  if (verifyResult === undefined || !verifyResult.success) return
  expect(verifyResult.data.counter).toBe(0)
  expect(verifyResult.data.publicKey).toMatch(/^[A-Za-z0-9_-]+$/u)

  const credentialIdResult = extensionPasskeyCredentialIdDecode(registrationResult.data.credential.credentialId)
  expect(credentialIdResult.success).toBe(true)
  if (!credentialIdResult.success) return
  expect(registrationResult.data.response.id).toBe(base64UrlEncode(credentialIdResult.data))
})

test("extension passkey assertions match RP, allow-list, user handle, and DER-sign with safe zero counters", async () => {
  const registrationChallenge = base64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => index + 10))
  const registrationResult = await extensionPasskeyCredentialCreate({
    rpId,
    userId,
    clientDataJSON: clientDataCreate("webauthn.create", registrationChallenge),
  })
  expect(registrationResult.success).toBe(true)
  if (!registrationResult.success) return
  const adapters = twoFactorAdaptersCreate()
  const storedResult = await adapters.webauthn?.registrationValidate?.(registrationResult.data.response, {
    challenge: registrationChallenge,
    credentialIds: [],
    expiresAt: 4_000_000_000,
    kind: "registration",
    origin,
    rpId,
    userUuid: "test-user",
  })
  expect(storedResult?.success).toBe(true)
  if (storedResult === undefined || !storedResult.success) return
  const assertionChallenge = base64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => index + 50))
  const assertionResult = await extensionPasskeyAssertionCreate(
    {
      rpId,
      clientDataJSON: clientDataCreate("webauthn.get", assertionChallenge),
      allowCredentialIds: [registrationResult.data.response.id],
      userHandle: userId,
    },
    [registrationResult.data.credential],
  )
  expect(assertionResult.success).toBe(true)
  if (!assertionResult.success) return
  expect(assertionResult.data.credential.counter).toBe(0)
  expect(assertionResult.data.response.response.userHandle).toBe(userId)
  expect(assertionResult.data.response.response.signature).toMatch(/^[A-Za-z0-9_-]+$/u)
  const signatureBytes = base64UrlDecodeForTest(assertionResult.data.response.response.signature)
  expect(signatureBytes[0]).toBe(0x30)
  expect(signatureBytes[2]).toBe(0x02)

  const verifyResult = await adapters.webauthn?.loginValidate?.(assertionResult.data.response, {
    challenge: assertionChallenge,
    credentialIds: [registrationResult.data.response.id],
    credentials: [
      {
        id: registrationResult.data.response.id,
        publicKey: storedResult.data.publicKey,
        counter: storedResult.data.counter,
      },
    ],
    expiresAt: 4_000_000_000,
    kind: "login",
    origin,
    rpId,
    userUuid: "test-user",
  })
  expect(verifyResult).toEqual({
    success: true,
    data: { credentialId: registrationResult.data.response.id, newCounter: 0 },
  })

  const wrongRpResult = await extensionPasskeyAssertionCreate(
    {
      rpId: "other.test",
      clientDataJSON: clientDataCreate("webauthn.get", assertionChallenge),
    },
    [registrationResult.data.credential],
  )
  expect(wrongRpResult.success).toBe(false)
})

test("extension passkey authentication increments only non-zero counters", async () => {
  const registrationResult = await extensionPasskeyCredentialCreate({
    rpId,
    userId,
    clientDataJSON: clientDataCreate("webauthn.create", "AQ"),
  })
  expect(registrationResult.success).toBe(true)
  if (!registrationResult.success) return
  const assertionResult = await extensionPasskeyAssertionCreate(
    {
      rpId,
      clientDataJSON: clientDataCreate("webauthn.get", "Ag"),
      allowCredentialIds: [registrationResult.data.response.id],
    },
    [{ ...registrationResult.data.credential, counter: 7 }],
  )
  expect(assertionResult.success).toBe(true)
  if (!assertionResult.success) return
  expect(assertionResult.data.credential.counter).toBe(8)
})

test("extension passkey COSE encoding uses the canonical ES256 EC2 map", () => {
  const keyResult = extensionCoseP256PublicKeyEncode(new Uint8Array(32).fill(1), new Uint8Array(32).fill(2))
  expect(keyResult.success).toBe(true)
  if (!keyResult.success) return
  expect(keyResult.data.byteLength).toBe(77)
  expect(Array.from(keyResult.data.slice(0, 10))).toEqual([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20])
  expect(keyResult.data[42]).toBe(0x22)
})

test("extension passkey operations require a one-shot explicit consent context", async () => {
  const service = extensionBackgroundServiceCreate({
    apiClient: {} as never,
    storage: {} as never,
    vaultSession: {} as never,
    alarms: { onAlarm: () => {} } as never,
  })
  const request = {
    rpId,
    userId,
    clientDataJSON: clientDataCreate("webauthn.create", "AQ"),
  }
  const contextResult = service.passkeyConsentContextCreate(request)
  expect(contextResult.success).toBe(true)
  if (!contextResult.success) return
  const deniedResult = await service.passkeyCredentialCreate({
    ...request,
    consent: { requestId: contextResult.data.requestId, approved: false },
  })
  expect(deniedResult).toMatchObject({ success: false, code: "platform.forbidden", statusCode: 403 })
  const replayResult = await service.passkeyCredentialCreate({
    ...request,
    consent: { requestId: contextResult.data.requestId, approved: true },
  })
  expect(replayResult).toMatchObject({ success: false, code: "platform.forbidden", statusCode: 403 })
})

test("extension passkey background persistence stores registration and atomically advances a non-zero counter", async () => {
  const registrationClientData = clientDataCreate("webauthn.create", "AQ")
  const registrationResult = await extensionPasskeyCredentialCreate({
    rpId,
    userId,
    clientDataJSON: registrationClientData,
  })
  expect(registrationResult.success).toBe(true)
  if (!registrationResult.success) return
  const plainCipher = {
    object: "cipherDetails" as const,
    id: "cipher-id",
    type: 1 as const,
    revisionDate: "2026-08-31T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    name: "Example",
    notes: null,
    login: {
      username: null,
      password: null,
      uris: [{ uri: "https://example.test", match: null }],
      totp: null,
      fido2Credentials: [{ ...registrationResult.data.credential, counter: 1 }],
    },
    fields: [],
  }
  const harness = passkeyServiceHarnessCreate(plainCipher)
  await harness.ready
  const contextResult = harness.service.passkeyConsentContextCreate({
    rpId,
    userId,
    clientDataJSON: registrationClientData,
    cipherId: "cipher-id",
  })
  expect(contextResult.success).toBe(true)
  if (!contextResult.success) return
  const registrationResponse = await harness.service.passkeyCredentialCreate({
    rpId,
    userId,
    clientDataJSON: registrationClientData,
    cipherId: "cipher-id",
    consent: { requestId: contextResult.data.requestId, approved: true },
  })
  expect(registrationResponse).toMatchObject({ success: true })
  expect(harness.updateCalls).toHaveLength(1)
  expect(JSON.stringify(registrationResponse)).not.toContain(registrationResult.data.credential.keyValue)

  const assertionClientData = clientDataCreate("webauthn.get", "Ag")
  const assertionContext = harness.service.passkeyConsentContextCreate({
    rpId,
    clientDataJSON: assertionClientData,
    allowCredentialIds: [registrationResult.data.response.id],
  })
  expect(assertionContext.success).toBe(true)
  if (!assertionContext.success) return
  const assertionResponse = await harness.service.passkeyAssertion({
    rpId,
    clientDataJSON: assertionClientData,
    allowCredentialIds: [registrationResult.data.response.id],
    consent: { requestId: assertionContext.data.requestId, approved: true },
  })
  expect(assertionResponse).toMatchObject({ success: true })
  expect(harness.updateCalls).toHaveLength(2)
})

function base64UrlDecodeForTest(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  return Uint8Array.from(atob(`${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`), (char) =>
    char.charCodeAt(0),
  )
}

function passkeyServiceHarnessCreate(cipher: Record<string, unknown>) {
  const values = new Map<string, unknown>()
  const area: ExtensionStorageArea = {
    async get<T extends Record<string, unknown> = Record<string, unknown>>(keys?: string | string[] | null) {
      const requestedKeys =
        keys === undefined || keys === null ? [...values.keys()] : typeof keys === "string" ? [keys] : keys
      const result: Record<string, unknown> = {}
      for (const key of requestedKeys) {
        const value = values.get(key)
        if (value !== undefined) result[key] = value
      }
      return result as T
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) values.set(key, value)
    },
    async remove(keys) {
      for (const key of typeof keys === "string" ? [keys] : keys) values.delete(key)
    },
  }
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: area, session: area })
  const storage = extensionStorageCreate(adapter)
  const updateCalls: unknown[] = []
  const payloadCreate = (value: unknown) =>
    resultCreate({ algorithm: "test", iv: "test", ciphertext: JSON.stringify(value) })
  const service = extensionBackgroundServiceCreate({
    storage,
    vaultSession: {
      isUnlocked: () => true,
      organizationKeysReplace: async () => resultCreate(undefined),
      personalLoginCipherDecrypt: async () => resultCreate(cipher as never),
      personalLoginCipherEncrypt: async (value: unknown) => resultCreate(value as never),
      encryptedPayloadEncrypt: async (value: unknown) => payloadCreate(value),
      encryptedPayloadDecrypt: async (payload: { ciphertext: string }) =>
        resultCreate(new TextEncoder().encode(payload.ciphertext)),
    } as never,
    alarms: { onAlarm: () => {} } as never,
    apiClient: {
      revisionDate: async () => resultCreate(1),
      sync: async () =>
        resultCreate({
          profile: {},
          folders: [],
          collections: [],
          policies: [],
          ciphers: [cipher],
          sends: [],
          object: "sync",
        } as unknown as BitwardenSyncEnvelope),
      cipherCreate: async () => resultCreate(cipher as never),
      cipherUpdate: async (_cipherId: string, request: unknown) => {
        updateCalls.push(request)
        return resultCreate(cipher as never)
      },
    } as never,
  })
  const ready = storage.authSessionSave({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Date.now() + 60_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: "user@example.test",
  })
  return { service, updateCalls, ready }
}
