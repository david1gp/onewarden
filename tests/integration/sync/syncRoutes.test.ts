import { afterEach, expect, test } from "bun:test"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import { folderSave } from "../../../src/server/contexts/folders/folderSave.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { sendSave } from "../../../src/server/contexts/sends/sendSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const initialDate = "2026-08-27T00:00:00.000Z"
const currentDate = "2026-08-28T00:00:00.000Z"
const databases: DatabaseConnection[] = []

function userCreate(): IdentityUser {
  return {
    uuid: "sync-user",
    enabled: true,
    createdAt: initialDate,
    updatedAt: initialDate,
    verifiedAt: initialDate,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "sync@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Sync User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 600_000,
    passwordHint: null,
    akey: "encrypted-user-key",
    privateKey: null,
    publicKey: null,
    securityStamp: "sync-security-stamp",
    stampException: null,
    equivalentDomains: JSON.stringify([["custom.example", "login.example"]]),
    excludedGlobals: JSON.stringify([2]),
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(): IdentityDevice {
  return {
    uuid: "sync-device",
    createdAt: initialDate,
    updatedAt: initialDate,
    userUuid: "sync-user",
    name: "Sync Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "sync-refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate()
  const device = deviceCreate()
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate(initialDate), false).success).toBe(true)
  expect(
    folderSave(database, {
      uuid: "sync-folder",
      createdAt: initialDate,
      updatedAt: currentDate,
      userUuid: user.uuid,
      name: "Sync folder",
    }).success,
  ).toBe(true)
  expect(
    cipherSave(database, {
      uuid: "sync-cipher",
      createdAt: initialDate,
      updatedAt: currentDate,
      userUuid: user.uuid,
      organizationUuid: null,
      key: null,
      type: 1,
      name: "Sync cipher",
      notes: null,
      fields: "[]",
      data: JSON.stringify({ password: "encrypted-password", uris: [{ uri: "https://example.com" }] }),
      passwordHistory: null,
      deletedAt: null,
      reprompt: 0,
    }).success,
  ).toBe(true)
  expect(
    cipherSave(database, {
      uuid: "sync-ssh",
      createdAt: initialDate,
      updatedAt: currentDate,
      userUuid: user.uuid,
      organizationUuid: null,
      key: null,
      type: 5,
      name: "Sync SSH",
      notes: null,
      fields: "[]",
      data: JSON.stringify({ keyFingerprint: "fingerprint", privateKey: "private", publicKey: "public" }),
      passwordHistory: null,
      deletedAt: null,
      reprompt: 0,
    }).success,
  ).toBe(true)
  database.run("INSERT INTO folders_ciphers (cipher_uuid, folder_uuid) VALUES (?, ?)", ["sync-cipher", "sync-folder"])
  expect(
    sendSave(database, {
      uuid: "sync-send",
      userUuid: user.uuid,
      organizationUuid: null,
      name: "Sync send",
      notes: null,
      type: 0,
      data: JSON.stringify({ text: "encrypted-text" }),
      key: "send-key",
      passwordHash: null,
      passwordSalt: null,
      passwordIterations: null,
      maxAccessCount: null,
      accessCount: 0,
      creationDate: initialDate,
      revisionDate: currentDate,
      expirationDate: null,
      deletionDate: "9999-12-31T23:59:59.999Z",
      disabled: false,
      hideEmail: null,
    }).success,
  ).toBe(true)
  const clock = clockTestCreate(currentDate)
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "sync-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  return {
    app: serverAppCreate({
      clock,
      database,
      identity: {
        clock,
        config: identityConfigCreate(),
        database,
        identifier: identifierTestCreate(),
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example",
      },
    }),
    database,
    token: tokenResult.data.accessToken,
  }
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("sync composes the personal vault, sends, profile, decryption, revisions, and filtered domains", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/sync", {
    headers: { authorization: `Bearer ${context.token}`, "Bitwarden-Client-Version": "2024.12.0" },
  })
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body).toMatchObject({
    object: "sync",
    folders: [{ id: "sync-folder", name: "Sync folder", object: "folder", revisionDate: currentDate }],
    collections: [],
    policies: [],
    sends: [{ id: "sync-send", name: "Sync send", object: "send", revisionDate: currentDate }],
    userDecryption: {
      masterPasswordUnlock: {
        masterKeyEncryptedUserKey: "encrypted-user-key",
        masterKeyWrappedUserKey: "encrypted-user-key",
        salt: "sync@example.com",
      },
    },
  })
  expect(body.continuationToken).toBeUndefined()
  expect(body.profile.organizations).toEqual([])
  expect(body.ciphers).toHaveLength(2)
  expect(body.ciphers.find((cipher: { id: string }) => cipher.id === "sync-cipher")).toMatchObject({
    folderId: "sync-folder",
    revisionDate: currentDate,
  })
  expect(body.domains.equivalentDomains).toEqual([["custom.example", "login.example"]])
  expect(body.domains.globalEquivalentDomains.some((domain: { type: number }) => domain.type === 2)).toBe(false)
  expect(body.domains.globalEquivalentDomains.some((domain: { type: number }) => domain.type === 3)).toBe(true)
})

test("sync hides SSH ciphers for clients before the SSH-compatible version and can exclude domains", async () => {
  const context = await contextCreate()
  const oldClientResponse = await context.app.request("https://vault.example/api/sync", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect((await oldClientResponse.json()).ciphers).toHaveLength(1)

  const excludedDomainsResponse = await context.app.request("https://vault.example/api/sync?excludeDomains=true", {
    headers: { authorization: `Bearer ${context.token}`, "Bitwarden-Client-Version": "2024.12.0" },
  })
  expect((await excludedDomainsResponse.json()).domains).toBeNull()
})

test("domain settings aliases persist equivalent domains, exclusions, profile composition, and revision dates", async () => {
  const context = await contextCreate()
  const updateResponse = await context.app.request("https://vault.example/api/settings/domains", {
    body: JSON.stringify({ excludedGlobalEquivalentDomains: [3], equivalentDomains: [["one.example", "two.example"]] }),
    headers: authHeaders(context.token),
    method: "POST",
  })
  expect(updateResponse.status).toBe(200)
  expect(await updateResponse.json()).toEqual({})

  const domainsResponse = await context.app.request("https://vault.example/api/settings/domains", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  const domains = await domainsResponse.json()
  expect(domains.equivalentDomains).toEqual([["one.example", "two.example"]])
  expect(domains.globalEquivalentDomains.find((domain: { type: number }) => domain.type === 3).excluded).toBe(true)
  expect(domains.globalEquivalentDomains).toHaveLength(91)

  const putResponse = await context.app.request("https://vault.example/api/settings/domains", {
    body: JSON.stringify({ excludedGlobalEquivalentDomains: [], equivalentDomains: [] }),
    headers: authHeaders(context.token),
    method: "PUT",
  })
  expect(putResponse.status).toBe(200)

  const revisionResponse = await context.app.request("https://vault.example/api/accounts/revision-date", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(await revisionResponse.json()).toBe(Date.parse(currentDate))

  databaseProfileCompositionSeed(context.database)
  const profileResponse = await context.app.request("https://vault.example/api/accounts/profile", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect((await profileResponse.json()) as { twoFactorEnabled: boolean; organizations: unknown[] }).toMatchObject({
    twoFactorEnabled: true,
    organizations: [{ organizationUserId: "sync-membership", type: 4 }],
  })
})

function databaseProfileCompositionSeed(database: DatabaseConnection): void {
  database.run(
    "INSERT INTO organizations (uuid, name, billing_email, private_key, public_key) VALUES (?, ?, ?, ?, ?)",
    [
      "sync-organization",
      "Sync organization",
      "billing@example.com",
      "organization-private-key",
      "organization-public-key",
    ],
  )
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?)",
    [
      "sync-membership",
      "sync-user",
      "sync-organization",
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.manager,
    ],
  )
  database.run("INSERT INTO twofactor (uuid, user_uuid, atype, enabled, data, last_used) VALUES (?, ?, ?, ?, ?, ?)", [
    "sync-twofactor",
    "sync-user",
    0,
    1,
    "encrypted-secret",
    0,
  ])
}
