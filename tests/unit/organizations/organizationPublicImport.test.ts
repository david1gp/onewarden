import { afterEach, expect, test } from "bun:test"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { organizationPublicImport } from "../../../src/server/contexts/organizations/organizationPublicImport.js"
import type { OrganizationPublicImportOptions } from "../../../src/server/contexts/organizations/organizationPublicImportOptions.js"
import type { OrganizationPublicImportData } from "../../../src/server/contexts/organizations/organizationPublicImportDataSchema.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const organizationUuid = "00000000-0000-4000-8000-000000000201"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  const database = result.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Imported Organization",
    "billing@example.com",
  ])
  return database
}

function optionsCreate(
  database: DatabaseConnection,
  overrides: Partial<OrganizationPublicImportOptions> = {},
): OrganizationPublicImportOptions {
  return {
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    config: identityConfigCreate(),
    database,
    groupsEnabled: false,
    identifier: { uuid: () => "generated-uuid" },
    mail: mailCreate(),
    organizationUuid,
    ...overrides,
  }
}

function mailCreate(overrides: Partial<IdentityMailAdapter> = {}): IdentityMailAdapter {
  return {
    sendRegisterVerifyEmail: async () => resultCreate(undefined),
    sendWelcome: async () => resultCreate(undefined),
    sendWelcomeMustVerify: async () => resultCreate(undefined),
    ...overrides,
  }
}

function userInsert(database: DatabaseConnection, uuid: string, email: string, passwordHash = new Uint8Array()): void {
  database.run(
    `INSERT INTO users (uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      "2026-08-27T00:00:00.000Z",
      "2026-08-27T00:00:00.000Z",
      email,
      email,
      passwordHash,
      new Uint8Array([1]),
      600_000,
      "",
      `${uuid}-stamp"`,
    ],
  )
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization import creates deterministic invited members and synchronizes groups", async () => {
  const database = databaseCreate()
  const options = optionsCreate(database, {
    groupsEnabled: true,
    identifier: {
      uuid: () =>
        `generated-${database.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM users").get()?.count ?? 0}`,
    },
  })
  const data: OrganizationPublicImportData = {
    groups: [{ name: "Imported Group", externalId: "group-1", memberExternalIds: ["member-1"] }],
    members: [{ email: "New@Example.com", externalId: "member-1", deleted: false }],
    overwriteExisting: false,
  }

  expect(await organizationPublicImport(data, options)).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT email, name, length(password_hash) AS password_length FROM users").all()).toEqual([
    { email: "new@example.com", name: "new@example.com", password_length: 0 },
  ])
  expect(database.query("SELECT status, atype, external_id, invited_by_email FROM users_organizations").all()).toEqual([
    {
      status: organizationMembershipStatus.invited,
      atype: organizationMembershipType.user,
      external_id: "member-1",
      invited_by_email: "billing@example.com",
    },
  ])
  expect(database.query("SELECT email FROM invitations").all()).toEqual([{ email: "new@example.com" }])
  expect(database.query("SELECT name, external_id FROM groups").all()).toEqual([
    { name: "Imported Group", external_id: "group-1" },
  ])
  expect(database.query("SELECT COUNT(*) AS count FROM groups_users").get()).toEqual({ count: 1 })
})

test("organization import restores and revokes memberships, protects the last owner, and overwrites omissions", async () => {
  const database = databaseCreate()
  userInsert(database, "existing-user", "existing@example.com", new Uint8Array([1]))
  userInsert(database, "owner-user", "owner@example.com", new Uint8Array([1]))
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["existing-member", "existing-user", organizationUuid, "", -128, organizationMembershipType.user, "existing-id"],
  )
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "owner-member",
      "owner-user",
      organizationUuid,
      "",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
      "owner-id",
    ],
  )
  const options = optionsCreate(database, { identifier: { uuid: () => "new-member" } })

  expect(
    await organizationPublicImport(
      {
        groups: [],
        members: [
          { email: "existing@example.com", externalId: "existing-id", deleted: false },
          { email: "owner@example.com", externalId: "owner-id", deleted: true },
        ],
        overwriteExisting: true,
      },
      options,
    ),
  ).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT status FROM users_organizations WHERE uuid = ?").get("existing-member")).toEqual({
    status: organizationMembershipStatus.invited,
  })
  expect(database.query("SELECT status FROM users_organizations WHERE uuid = ?").get("owner-member")).toEqual({
    status: organizationMembershipStatus.confirmed,
  })
})

test("organization import rolls back a new member when deterministic invite delivery fails", async () => {
  const database = databaseCreate()
  const options = optionsCreate(database, {
    config: identityConfigCreate({ MAIL_ENABLED: true }),
    mail: mailCreate({
      sendInvite: async () => ({ success: false, op: "testMail", errorMessage: "mail failed" }),
    }),
    identifier: { uuid: () => "rollback-id" },
  })

  const result = await organizationPublicImport(
    {
      groups: [],
      members: [{ email: "rollback@example.com", externalId: "rollback", deleted: false }],
      overwriteExisting: false,
    },
    options,
  )

  expect(result.success).toBe(false)
  expect(database.query("SELECT COUNT(*) AS count FROM users").get()).toEqual({ count: 0 })
  expect(database.query("SELECT COUNT(*) AS count FROM users_organizations").get()).toEqual({ count: 0 })
})
