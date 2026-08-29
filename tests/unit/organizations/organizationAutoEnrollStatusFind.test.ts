import { afterEach, expect, test } from "bun:test"
import { organizationAutoEnrollStatusFind } from "../../../src/server/contexts/organizations/organizationAutoEnrollStatusFind.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"

const organizationUuid = "00000000-0000-4000-8000-000000000401"
const policyUuid = "00000000-0000-4000-8000-000000000402"
const membershipUuid = "00000000-0000-4000-8000-000000000403"
const userUuid = "00000000-0000-4000-8000-000000000404"
const fakeSsoOrganizationUuid = "00000000-01DC-01DC-01DC-000000000000"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  const database = result.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Organization",
    "billing@example.com",
  ])
  database.run(
    `INSERT INTO users (
       uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      "user@example.com",
      "User",
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      "akey",
      "stamp",
    ],
  )
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [membershipUuid, userUuid, organizationUuid, 0, "organization-key", 2, 2],
  )
  return database
}

function policySet(database: DatabaseConnection, data: string, enabled = 1): void {
  database.run(
    `INSERT INTO org_policies (uuid, org_uuid, atype, enabled, data, revision_date)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(uuid) DO UPDATE SET enabled = excluded.enabled, data = excluded.data`,
    [policyUuid, organizationUuid, 8, enabled, data, "2026-08-28T00:00:00.000Z"],
  )
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("real, fake, and unknown identifiers preserve the upstream status contract", () => {
  const database = databaseCreate()
  policySet(database, JSON.stringify({ autoEnrollEnabled: true }))

  expect(organizationAutoEnrollStatusFind(database, userUuid, organizationUuid)).toEqual({
    success: true,
    data: { id: organizationUuid, identifier: organizationUuid, resetPasswordEnabled: true },
  })
  expect(organizationAutoEnrollStatusFind(database, userUuid, fakeSsoOrganizationUuid)).toEqual({
    success: true,
    data: { id: organizationUuid, identifier: organizationUuid, resetPasswordEnabled: true },
  })
  expect(organizationAutoEnrollStatusFind(database, userUuid, "unknown-organization")).toEqual({
    success: true,
    data: { id: "unknown-organization", identifier: "unknown-organization", resetPasswordEnabled: false },
  })
  expect(organizationAutoEnrollStatusFind(database, "user-without-main-organization", fakeSsoOrganizationUuid)).toEqual(
    {
      success: true,
      data: {
        id: fakeSsoOrganizationUuid,
        identifier: fakeSsoOrganizationUuid,
        resetPasswordEnabled: false,
      },
    },
  )
})

test("reset-password policy variants match upstream deserialization", () => {
  const database = databaseCreate()
  const cases = [
    ["camel-case enabled", JSON.stringify({ autoEnrollEnabled: true }), 1, true],
    ["pascal-case enabled", JSON.stringify({ AutoEnrollEnabled: true }), 1, true],
    ["camel-case disabled", JSON.stringify({ autoEnrollEnabled: false }), 1, false],
    ["pascal-case disabled", JSON.stringify({ AutoEnrollEnabled: false }), 1, false],
    ["unknown fields are ignored", JSON.stringify({ autoEnrollEnabled: true, unknown: "ignored" }), 1, true],
    ["duplicate casing is rejected", JSON.stringify({ autoEnrollEnabled: true, AutoEnrollEnabled: true }), 1, false],
    ["missing field is rejected", JSON.stringify({}), 1, false],
    ["string value is rejected", JSON.stringify({ autoEnrollEnabled: "true" }), 1, false],
    ["null value is rejected", JSON.stringify({ autoEnrollEnabled: null }), 1, false],
    ["array is rejected", JSON.stringify([]), 1, false],
    ["primitive is rejected", JSON.stringify(true), 1, false],
    ["malformed JSON is rejected", "{autoEnrollEnabled:true}", 1, false],
    ["duplicate field is rejected", '{"autoEnrollEnabled":false,"autoEnrollEnabled":true}', 1, false],
    ["disabled policy stays disabled", JSON.stringify({ autoEnrollEnabled: true }), 0, false],
  ] as const

  for (const [, data, enabled, expected] of cases) {
    database.run("DELETE FROM org_policies WHERE uuid = ?", [policyUuid])
    policySet(database, data, enabled)
    expect(organizationAutoEnrollStatusFind(database, userUuid, organizationUuid)).toEqual({
      success: true,
      data: { id: organizationUuid, identifier: organizationUuid, resetPasswordEnabled: expected },
    })
  }

  database.run("DELETE FROM org_policies WHERE uuid = ?", [policyUuid])
  expect(organizationAutoEnrollStatusFind(database, userUuid, organizationUuid)).toEqual({
    success: true,
    data: { id: organizationUuid, identifier: organizationUuid, resetPasswordEnabled: false },
  })
})
