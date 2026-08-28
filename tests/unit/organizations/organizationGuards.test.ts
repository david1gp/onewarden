import { afterEach, expect, test } from "bun:test"
import { organizationCollectionManageableByUser } from "../../../src/server/contexts/organizations/organizationCollectionManageableByUser.js"
import { organizationMembershipFindByUserAndOrganization } from "../../../src/server/contexts/organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipRoleCheck } from "../../../src/server/contexts/organizations/organizationMembershipRoleCheck.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import type { OrganizationMembership } from "../../../src/server/contexts/organizations/organizationMembershipSchema.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"

const userUuid = "organization-user"
const organizationUuid = "00000000-0000-4000-8000-000000000020"
const otherOrganizationUuid = "00000000-0000-4000-8000-000000000021"
const membershipUuid = "00000000-0000-4000-8000-000000000022"
const collectionUuid = "00000000-0000-4000-8000-000000000023"
const otherCollectionUuid = "00000000-0000-4000-8000-000000000024"
const groupUuid = "00000000-0000-4000-8000-000000000025"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  const database = result.data
  databases.push(database)
  database.run(
    `INSERT INTO users (uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      "organization-user@example.com",
      "Organization User",
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      "akey",
      "security-stamp",
    ],
  )
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Organization",
    "billing@example.com",
  ])
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    otherOrganizationUuid,
    "Other Organization",
    "other-billing@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      membershipUuid,
      userUuid,
      organizationUuid,
      0,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Collection",
  ])
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    otherCollectionUuid,
    otherOrganizationUuid,
    "Other Collection",
  ])
  return database
}

function membershipCreate(overrides: Partial<OrganizationMembership> = {}): OrganizationMembership {
  return {
    uuid: membershipUuid,
    userUuid,
    organizationUuid,
    invitedByEmail: null,
    accessAll: false,
    akey: "organization-key",
    status: organizationMembershipStatus.confirmed,
    type: organizationMembershipType.user,
    resetPasswordKey: null,
    externalId: null,
    ...overrides,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization membership role checks match upstream statuses and privilege hierarchy", () => {
  const types = [
    organizationMembershipType.owner,
    organizationMembershipType.admin,
    organizationMembershipType.manager,
    organizationMembershipType.user,
  ]
  for (const type of types) {
    const membership = membershipCreate({ type })
    expect(organizationMembershipRoleCheck(membership, "member")).toBe(true)
  }
  expect(organizationMembershipRoleCheck(membershipCreate({ type: organizationMembershipType.owner }), "owner")).toBe(
    true,
  )
  expect(organizationMembershipRoleCheck(membershipCreate({ type: organizationMembershipType.admin }), "owner")).toBe(
    false,
  )
  expect(organizationMembershipRoleCheck(membershipCreate({ type: organizationMembershipType.owner }), "admin")).toBe(
    true,
  )
  expect(organizationMembershipRoleCheck(membershipCreate({ type: organizationMembershipType.admin }), "manager")).toBe(
    true,
  )
  expect(organizationMembershipRoleCheck(membershipCreate({ type: organizationMembershipType.manager }), "admin")).toBe(
    false,
  )
  expect(organizationMembershipRoleCheck(membershipCreate({ type: organizationMembershipType.user }), "manager")).toBe(
    false,
  )

  for (const status of [organizationMembershipStatus.invited, organizationMembershipStatus.accepted]) {
    expect(organizationMembershipRoleCheck(membershipCreate({ status }), "member")).toBe(true)
    expect(
      organizationMembershipRoleCheck(membershipCreate({ status, type: organizationMembershipType.owner }), "owner"),
    ).toBe(false)
  }
  for (const status of [organizationMembershipStatus.revoked, 99]) {
    expect(organizationMembershipRoleCheck(membershipCreate({ status }), "member")).toBe(false)
    expect(
      organizationMembershipRoleCheck(membershipCreate({ status, type: organizationMembershipType.owner }), "owner"),
    ).toBe(false)
  }
  expect(organizationMembershipRoleCheck(membershipCreate({ type: 99 }), "member")).toBe(false)
})

test("organization membership persistence maps status, role, access, and optional fields", () => {
  const database = databaseCreate()
  expect(organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)).toEqual({
    success: true,
    data: membershipCreate(),
  })
  expect(organizationMembershipFindByUserAndOrganization(database, "missing-user", organizationUuid)).toEqual({
    success: true,
    data: null,
  })
})

test("collection manageability handles direct access, org roles, and group access without crossing organizations", () => {
  const database = databaseCreate()
  const manageable = (groupsEnabled = false, collection = collectionUuid, organization = organizationUuid) =>
    organizationCollectionManageableByUser(database, collection, userUuid, organization, groupsEnabled)

  expect(manageable()).toEqual({ success: true, data: false })
  database.run("UPDATE users_organizations SET access_all = 1 WHERE uuid = ?", [membershipUuid])
  expect(manageable()).toEqual({ success: true, data: true })
  database.run("UPDATE users_organizations SET access_all = 0, atype = ? WHERE uuid = ?", [
    organizationMembershipType.admin,
    membershipUuid,
  ])
  expect(manageable()).toEqual({ success: true, data: true })
  database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.user,
    membershipUuid,
  ])
  database.run("INSERT INTO users_collections (user_uuid, collection_uuid, manage) VALUES (?, ?, ?)", [
    userUuid,
    collectionUuid,
    1,
  ])
  expect(manageable()).toEqual({ success: true, data: true })
  database.run("UPDATE users_collections SET manage = 0 WHERE user_uuid = ? AND collection_uuid = ?", [
    userUuid,
    collectionUuid,
  ])
  expect(manageable()).toEqual({ success: true, data: false })

  database.run(
    "INSERT INTO groups (uuid, organizations_uuid, name, access_all, creation_date, revision_date) VALUES (?, ?, ?, ?, ?, ?)",
    [groupUuid, organizationUuid, "Group", 1, "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
  )
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    groupUuid,
    membershipUuid,
  ])
  expect(manageable(false)).toEqual({ success: true, data: false })
  expect(manageable(true)).toEqual({ success: true, data: true })
  database.run("UPDATE groups SET access_all = 0 WHERE uuid = ?", [groupUuid])
  database.run("INSERT INTO collections_groups (collections_uuid, groups_uuid, manage) VALUES (?, ?, ?)", [
    collectionUuid,
    groupUuid,
    1,
  ])
  expect(manageable(true)).toEqual({ success: true, data: true })
  expect(manageable(false)).toEqual({ success: true, data: false })
  expect(manageable(true, otherCollectionUuid, organizationUuid)).toEqual({ success: true, data: false })
  expect(manageable(true, collectionUuid, otherOrganizationUuid)).toEqual({ success: true, data: false })
})
