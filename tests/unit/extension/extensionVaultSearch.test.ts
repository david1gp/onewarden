import { expect, test } from "bun:test"
import * as v from "valibot"
import { extensionBackgroundCipherSummaryCreate } from "../../../src/extension/background/extensionBackgroundCipherSummaryCreate.js"
import { extensionBackgroundCipherSummarySchema } from "../../../src/extension/background/extensionBackgroundCipherSummarySchema.js"
import { extensionSyncSnapshotSchema } from "../../../src/extension/background/extensionSyncSnapshotSchema.js"
import { extensionVaultSearch } from "../../../src/extension/background/extensionVaultSearch.js"
import { extensionVaultSearchRequestSchema } from "../../../src/extension/background/extensionVaultSearchRequestSchema.js"
import type { ExtensionPersonalLoginCipher } from "../../../src/extension/crypto/extensionPersonalLoginCipherSchema.js"

const organizationId = "organization-id"
const folderId = "folder-id"
const collectionId = "collection-id"

function snapshotCreate() {
  return v.parse(extensionSyncSnapshotSchema, {
    profile: { organizations: [{ id: organizationId, status: 2 }] },
    folders: [{ id: folderId, name: "Personal folder", object: "folder" }],
    collections: [{ id: collectionId, organizationId, name: "Team collection", object: "collection" }],
    policies: [],
    sends: [],
    object: "sync",
    ciphers: [
      {
        object: "cipherDetails",
        id: "login-id",
        type: 1,
        creationDate: "2026-09-01T00:00:00.000Z",
        revisionDate: "2026-09-01T00:00:00.000Z",
        deletedDate: null,
        archivedDate: null,
        organizationId,
        folderId,
        name: "Login item",
        notes: "login-secret-note",
        favorite: true,
        collectionIds: [collectionId],
        permissions: { delete: true, restore: false, secret: "permission-secret" },
        login: {
          username: "login-user",
          password: "login-secret-password",
          uri: "https://login.example.test",
          uris: [{ uri: "https://login.example.test", match: 0 }],
          totp: "login-secret-totp",
        },
        fields: [],
      },
      {
        object: "cipherDetails",
        id: "note-id",
        type: 2,
        creationDate: "2026-09-01T00:00:00.000Z",
        revisionDate: "2026-09-01T00:00:00.000Z",
        deletedDate: null,
        organizationId: null,
        folderId: null,
        name: "Secure note item",
        notes: "secure-note-secret",
        favorite: false,
        secureNote: { type: 0 },
        fields: [],
      },
      {
        object: "cipherDetails",
        id: "card-id",
        type: 3,
        creationDate: "2026-09-01T00:00:00.000Z",
        revisionDate: "2026-09-01T00:00:00.000Z",
        deletedDate: null,
        organizationId: null,
        folderId: null,
        name: "Card item",
        notes: null,
        card: {
          cardholderName: "Cardholder name",
          brand: "Visa",
          number: "card-secret-number",
          expMonth: "01",
          expYear: "2030",
          code: "card-secret-code",
        },
        fields: [],
      },
      {
        object: "cipherDetails",
        id: "identity-id",
        type: 4,
        creationDate: "2026-09-01T00:00:00.000Z",
        revisionDate: "2026-09-01T00:00:00.000Z",
        deletedDate: null,
        archivedDate: "2026-09-01T00:00:00.000Z",
        organizationId: null,
        folderId: null,
        name: "Identity item",
        notes: null,
        identity: {
          title: "Ms",
          firstName: "Identity",
          middleName: null,
          lastName: "Person",
          company: "Identity company",
          email: "identity-secret-email",
          ssn: "identity-secret-ssn",
        },
        fields: [],
      },
      {
        object: "cipherDetails",
        id: "ssh-id",
        type: 5,
        creationDate: "2026-09-01T00:00:00.000Z",
        revisionDate: "2026-09-01T00:00:00.000Z",
        deletedDate: "2026-09-01T00:00:00.000Z",
        organizationId: null,
        folderId: null,
        name: "SSH item",
        notes: null,
        sshKey: {
          keyFingerprint: "SHA256:ssh-fingerprint",
          publicKey: "ssh-public-key",
          privateKey: "ssh-secret-private-key",
        },
        fields: [],
      },
    ],
  })
}

function requestCreate(input: unknown = {}) {
  return v.parse(extensionVaultSearchRequestSchema, input)
}

test("extensionVaultSearch returns every cipher type and resource as summary-only data", () => {
  const result = extensionVaultSearch(snapshotCreate(), requestCreate({ includeDeleted: true, includeArchived: true }))

  expect(result.ciphers.map((cipher) => [cipher.id, cipher.type])).toEqual([
    ["card-id", 3],
    ["identity-id", 4],
    ["login-id", 1],
    ["note-id", 2],
    ["ssh-id", 5],
  ])
  expect(result.folders).toEqual([{ id: folderId, name: "Personal folder", object: "folder" }])
  expect(result.collections).toEqual([
    { id: collectionId, organizationId, name: "Team collection", object: "collection" },
  ])
  const serialized = JSON.stringify(result)
  for (const secret of [
    "login-secret-note",
    "login-secret-password",
    "login-secret-totp",
    "secure-note-secret",
    "card-secret-number",
    "card-secret-code",
    "identity-secret-email",
    "identity-secret-ssn",
    "ssh-secret-private-key",
    "permission-secret",
  ]) {
    expect(serialized).not.toContain(secret)
  }
})

test("extensionVaultSearch matches type-specific searchable metadata and applies cipher filters", () => {
  const snapshot = snapshotCreate()

  expect(extensionVaultSearch(snapshot, requestCreate({ query: "visa" })).ciphers.map((cipher) => cipher.id)).toEqual([
    "card-id",
  ])
  expect(
    extensionVaultSearch(snapshot, requestCreate({ query: "identity company", includeArchived: true })).ciphers.map(
      (cipher) => cipher.id,
    ),
  ).toEqual(["identity-id"])
  expect(
    extensionVaultSearch(
      snapshot,
      requestCreate({ query: "SHA256:ssh-fingerprint", includeDeleted: true }),
    ).ciphers.map((cipher) => cipher.id),
  ).toEqual(["ssh-id"])
  expect(extensionVaultSearch(snapshot, requestCreate({ type: 2 })).ciphers.map((cipher) => cipher.id)).toEqual([
    "note-id",
  ])
  expect(extensionVaultSearch(snapshot, requestCreate({ folderId })).ciphers.map((cipher) => cipher.id)).toEqual([
    "login-id",
  ])
  expect(extensionVaultSearch(snapshot, requestCreate({ collectionId })).ciphers.map((cipher) => cipher.id)).toEqual([
    "login-id",
  ])
  expect(extensionVaultSearch(snapshot, requestCreate({ organizationId })).ciphers.map((cipher) => cipher.id)).toEqual([
    "login-id",
  ])
  expect(extensionVaultSearch(snapshot, requestCreate({ favorite: true })).ciphers.map((cipher) => cipher.id)).toEqual([
    "login-id",
  ])
  expect(extensionVaultSearch(snapshot, requestCreate()).ciphers.map((cipher) => cipher.id)).not.toContain("ssh-id")
  expect(
    extensionVaultSearch(snapshot, requestCreate({ includeDeleted: true, includeArchived: true })).ciphers.map(
      (cipher) => cipher.id,
    ),
  ).toEqual(["card-id", "identity-id", "login-id", "note-id", "ssh-id"])
})

test("extensionVaultSearchRequestSchema rejects malformed or secret-bearing search requests", () => {
  expect(v.safeParse(extensionVaultSearchRequestSchema, { query: "x", unknown: true }).success).toBe(false)
  expect(v.safeParse(extensionVaultSearchRequestSchema, { query: "x".repeat(201) }).success).toBe(false)
  expect(v.safeParse(extensionVaultSearchRequestSchema, { query: "x", password: "secret" }).success).toBe(false)
  expect(
    v.safeParse(extensionBackgroundCipherSummarySchema, {
      object: "cipherMini",
      id: "cipher-id",
      type: 1,
      revisionDate: "2026-09-01T00:00:00.000Z",
      deletedDate: null,
      name: "Login",
      password: "secret",
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(extensionBackgroundCipherSummarySchema, {
      object: "cipherMini",
      id: "cipher-id",
      type: 1,
      revisionDate: "2026-09-01T00:00:00.000Z",
      deletedDate: null,
      name: "Login",
      permissions: { delete: true, secret: true },
    }).success,
  ).toBe(false)
  expect(
    extensionBackgroundCipherSummaryCreate({
      object: "cipherDetails",
      id: "cipher-id",
      type: 1,
      revisionDate: "2026-09-01T00:00:00.000Z",
      deletedDate: null,
      name: "Login",
      notes: null,
      login: { username: null, password: null, uris: [], totp: null },
      fields: [],
      permissions: { delete: true, restore: false, secret: "permission-secret" },
    } as unknown as ExtensionPersonalLoginCipher),
  ).toMatchObject({ permissions: { delete: true, restore: false } })
})
