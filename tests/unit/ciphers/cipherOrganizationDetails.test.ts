import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import { cipherOrganizationDetailsQuerySchema } from "../../../src/server/contexts/ciphers/cipherOrganizationDetailsQuerySchema.js"
import type { Cipher } from "../../../src/server/contexts/ciphers/cipher.js"
import { cipherOrganizationToJson } from "../../../src/server/contexts/ciphers/cipherOrganizationToJson.js"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import { organizationMembershipHasFullAccess } from "../../../src/server/contexts/organizations/organizationMembershipHasFullAccess.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { OrganizationMembership } from "../../../src/server/contexts/organizations/organizationMembershipSchema.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const organizationUuid = "00000000-0000-4000-8000-000000000901"
const collectionUuid = "00000000-0000-4000-8000-000000000902"
const cipherUuid = "00000000-0000-4000-8000-000000000903"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  result.data.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Organization",
    "billing@example.com",
  ])
  result.data.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Collection",
  ])
  return result.data
}

function membershipCreate(overrides: Partial<OrganizationMembership> = {}): OrganizationMembership {
  return {
    accessAll: false,
    akey: "organization-key",
    externalId: null,
    invitedByEmail: null,
    organizationUuid,
    resetPasswordKey: null,
    status: organizationMembershipStatus.confirmed,
    type: organizationMembershipType.user,
    userUuid: "00000000-0000-4000-8000-000000000904",
    uuid: "00000000-0000-4000-8000-000000000905",
    ...overrides,
  }
}

function cipherCreate(overrides: Partial<Cipher> = {}): Cipher {
  return {
    createdAt: "2026-08-27T00:00:00Z",
    data: JSON.stringify({
      Uris: [{ Match: "2", Uri: "https://example.com" }],
      PasswordRevisionDate: "2026-08-27T00:00:00+00:00",
    }),
    deletedAt: null,
    fields: JSON.stringify([{ Name: "custom", Type: "7", Value: "encrypted-value" }]),
    key: "encrypted-cipher-key",
    name: "Organization Cipher",
    notes: "encrypted-notes",
    organizationUuid,
    passwordHistory: JSON.stringify([
      { Password: "old-password", LastUsedDate: "2026-08-26T00:00:00Z" },
      { Password: null, LastUsedDate: "2026-08-26T00:00:00Z" },
      { Password: "missing-date" },
    ]),
    reprompt: 1,
    type: 1,
    updatedAt: "2026-08-28T00:00:00.1234567Z",
    userUuid: null,
    uuid: cipherUuid,
    ...overrides,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization details query parsing requires one UUID organizationId and ignores unrelated fields", () => {
  const result = v.safeParse(cipherOrganizationDetailsQuerySchema, {
    organizationId: organizationUuid,
    continuationToken: "ignored",
  })
  expect(result.success).toBe(true)
  if (result.success) expect(result.output).toEqual({ organizationId: organizationUuid })

  expect(v.safeParse(cipherOrganizationDetailsQuerySchema, {})).toMatchObject({ success: false })
  expect(v.safeParse(cipherOrganizationDetailsQuerySchema, { organizationId: "not-a-uuid" })).toMatchObject({
    success: false,
  })
  expect(v.safeParse(cipherOrganizationDetailsQuerySchema, { OrganizationId: organizationUuid })).toMatchObject({
    success: false,
  })
})

test("organization full access follows confirmed role and accessAll semantics", () => {
  expect(organizationMembershipHasFullAccess(membershipCreate({ type: organizationMembershipType.owner }))).toBe(true)
  expect(organizationMembershipHasFullAccess(membershipCreate({ type: organizationMembershipType.admin }))).toBe(true)
  expect(organizationMembershipHasFullAccess(membershipCreate({ accessAll: true }))).toBe(true)
  expect(organizationMembershipHasFullAccess(membershipCreate({ type: organizationMembershipType.manager }))).toBe(
    false,
  )
  expect(
    organizationMembershipHasFullAccess(
      membershipCreate({ accessAll: true, status: organizationMembershipStatus.accepted }),
    ),
  ).toBe(false)
  expect(
    organizationMembershipHasFullAccess(
      membershipCreate({ type: organizationMembershipType.owner, status: organizationMembershipStatus.revoked }),
    ),
  ).toBe(false)
})

test("organization cipher serialization matches organization sync fields and normalizes encrypted JSON", async () => {
  const database = databaseCreate()
  const cipher = cipherCreate()
  expect(cipherSave(database, cipher)).toEqual({ success: true, data: undefined })
  database.run("INSERT INTO ciphers_collections (cipher_uuid, collection_uuid) VALUES (?, ?)", [
    cipherUuid,
    collectionUuid,
  ])

  const result = await cipherOrganizationToJson(database, cipher, organizationUuid, {
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    origin: "https://vault.example",
    privateKey: undefined,
  })
  expect(result).toEqual({
    success: true,
    data: {
      attachments: null,
      bankAccount: null,
      card: null,
      collectionIds: [collectionUuid],
      creationDate: "2026-08-27T00:00:00.000000Z",
      deletedDate: null,
      driversLicense: null,
      fields: [{ name: "custom", type: 7, value: "encrypted-value" }],
      identity: null,
      id: cipherUuid,
      key: "encrypted-cipher-key",
      login: {
        passwordRevisionDate: "2026-08-27T00:00:00.000000+00:00",
        uri: "https://example.com",
        uris: [{ match: 2, uri: "https://example.com" }],
      },
      name: "Organization Cipher",
      notes: "encrypted-notes",
      object: "cipherDetails",
      organizationId: organizationUuid,
      organizationUseTotp: true,
      passport: null,
      passwordHistory: [
        { lastUsedDate: "2026-08-26T00:00:00.000000Z", password: "old-password" },
        { lastUsedDate: "1970-01-01T00:00:00.000000Z", password: "missing-date" },
      ],
      reprompt: 1,
      revisionDate: "2026-08-28T00:00:00.123456Z",
      secureNote: null,
      sshKey: null,
      type: 1,
    },
  })
  if (!result.success) return
  for (const field of ["archivedDate", "edit", "favorite", "folderId", "permissions", "viewPassword"])
    expect(result.data).not.toHaveProperty(field)
})

test("organization cipher serialization rejects an invalid cipher type", async () => {
  const database = databaseCreate()
  const result = await cipherOrganizationToJson(database, cipherCreate({ type: 99 }), organizationUuid, {
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    origin: "https://vault.example",
    privateKey: undefined,
  })
  expect(result).toMatchObject({
    success: false,
    errorMessage: `Cipher ${cipherUuid} has an invalid type 99`,
    statusCode: 400,
  })
})
