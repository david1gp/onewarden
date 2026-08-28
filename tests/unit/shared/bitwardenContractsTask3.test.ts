import { expect, test } from "bun:test"
import * as v from "valibot"
import { bitwardenApiRoutes } from "../../../src/shared/api/bitwardenApiRoutes.js"
import { bitwardenEncryptedLoginCipherCreateRequestSchema } from "../../../src/shared/api/bitwardenEncryptedLoginCipherCreateRequestSchema.js"
import { bitwardenEncryptedLoginCipherListResponseSchema } from "../../../src/shared/api/bitwardenEncryptedLoginCipherListResponseSchema.js"
import { bitwardenEncryptedLoginCipherSchema } from "../../../src/shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { bitwardenEnvironmentSchema } from "../../../src/shared/api/bitwardenEnvironmentSchema.js"
import { bitwardenPasswordTokenRequestSchema } from "../../../src/shared/api/bitwardenPasswordTokenRequestSchema.js"
import { bitwardenPasswordTokenResponseSchema } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import { bitwardenPreloginRequestSchema } from "../../../src/shared/api/bitwardenPreloginRequestSchema.js"
import { bitwardenPreloginResponseSchema } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import { bitwardenRefreshTokenRequestSchema } from "../../../src/shared/api/bitwardenRefreshTokenRequestSchema.js"
import { bitwardenRefreshTokenResponseSchema } from "../../../src/shared/api/bitwardenRefreshTokenResponseSchema.js"
import { bitwardenRevisionDateResponseSchema } from "../../../src/shared/api/bitwardenRevisionDateResponseSchema.js"
import { bitwardenSyncEnvelopeSchema } from "../../../src/shared/api/bitwardenSyncEnvelopeSchema.js"

const login = {
  username: "encrypted username",
  password: "encrypted password",
  uris: [{ uri: "encrypted uri", match: null }],
  uri: "encrypted uri",
  totp: null,
}

const cipher = {
  object: "cipherDetails",
  id: "cipher-id",
  type: 1,
  creationDate: "2026-08-28T00:00:00.000Z",
  revisionDate: "2026-08-28T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "encrypted name",
  notes: "encrypted notes",
  favorite: false,
  key: null,
  collectionIds: [],
  login,
  fields: [{ name: "encrypted field name", value: "encrypted field value", type: 0, linkedId: null, custom: true }],
}

test("shared Bitwarden routes and normalized environment locations are browser-neutral", () => {
  expect(bitwardenApiRoutes.cipherCreate).toEqual({ method: "POST", path: "/api/ciphers" })
  expect(
    v.safeParse(bitwardenEnvironmentSchema, {
      api: "https://vault.example/api",
      identity: "https://vault.example/identity",
      icons: "https://vault.example/icons",
      notifications: "https://vault.example/notifications",
      webVault: "https://vault.example",
    }).success,
  ).toBe(true)
})

test("prelogin and token contracts preserve OneWarden casing and Vaultwarden request aliases", () => {
  expect(v.safeParse(bitwardenPreloginRequestSchema, { email: "user@example.com" }).success).toBe(true)
  expect(
    v.safeParse(bitwardenPreloginResponseSchema, {
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      kdfSettings: { iterations: 600_000, kdfType: 0, memory: null, parallelism: null },
      salt: null,
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(bitwardenPasswordTokenRequestSchema, {
      granttype: "password",
      clientid: "browser",
      password: "encrypted password hash",
      scope: "api offline_access",
      username: "user@example.com",
      deviceidentifier: "device-id",
      devicename: "OneWarden",
      devicetype: "14",
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(bitwardenRefreshTokenRequestSchema, {
      grant_type: "refresh_token",
      refreshtoken: "refresh-token",
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(bitwardenPasswordTokenResponseSchema, {
      access_token: "access-token",
      expires_in: 3600,
      token_type: "Bearer",
      refresh_token: "refresh-token",
      PrivateKey: null,
      Kdf: 0,
      KdfIterations: 600_000,
      KdfMemory: null,
      KdfParallelism: null,
      ResetMasterPassword: false,
      ForcePasswordReset: false,
      MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
      scope: "api offline_access",
      AccountKeys: null,
      UserDecryptionOptions: { HasMasterPassword: false, MasterPasswordUnlock: null, Object: "userDecryptionOptions" },
      Key: "encrypted user key",
      TwoFactorToken: "two-factor-token",
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(bitwardenRefreshTokenResponseSchema, {
      refresh_token: "new-refresh-token",
      access_token: "new-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "api offline_access",
    }).success,
  ).toBe(true)
})

test("cipher, sync, and revision contracts accept encrypted login data and custom fields", () => {
  expect(v.safeParse(bitwardenRevisionDateResponseSchema, 1_756_368_000_000).success).toBe(true)
  expect(v.safeParse(bitwardenEncryptedLoginCipherSchema, cipher).success).toBe(true)
  expect(
    v.safeParse(bitwardenEncryptedLoginCipherListResponseSchema, {
      data: [cipher],
      object: "list",
      continuationToken: null,
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(bitwardenEncryptedLoginCipherCreateRequestSchema, {
      organizationID: null,
      type: 1,
      name: "encrypted name",
      notes: null,
      fields: cipher.fields,
      login,
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(bitwardenSyncEnvelopeSchema, {
      profile: {},
      folders: [],
      collections: [],
      policies: [],
      ciphers: [cipher, { id: "note-id", type: 2, name: "encrypted note", notes: null, login: null, fields: [] }],
      domains: null,
      sends: [],
      userDecryption: {},
      object: "sync",
    }).success,
  ).toBe(true)
})
