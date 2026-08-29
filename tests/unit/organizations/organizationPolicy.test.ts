import { afterEach, expect, test } from "bun:test"
import { organizationPolicyCreate } from "../../../src/server/contexts/organizations/organizationPolicyCreate.js"
import { organizationPolicyDelete } from "../../../src/server/contexts/organizations/organizationPolicyDelete.js"
import { organizationPolicyDeleteAllByOrganization } from "../../../src/server/contexts/organizations/organizationPolicyDeleteAllByOrganization.js"
import { organizationPolicyFindByOrganization } from "../../../src/server/contexts/organizations/organizationPolicyFindByOrganization.js"
import { organizationPolicyFindByOrganizationAndType } from "../../../src/server/contexts/organizations/organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicyCheckUserAllowed } from "../../../src/server/contexts/organizations/organizationPolicyCheckUserAllowed.js"
import { organizationPolicyIsApplicableToUser } from "../../../src/server/contexts/organizations/organizationPolicyIsApplicableToUser.js"
import { organizationPolicyIsHideEmailDisabled } from "../../../src/server/contexts/organizations/organizationPolicyIsHideEmailDisabled.js"
import { organizationPolicySave } from "../../../src/server/contexts/organizations/organizationPolicySave.js"
import { organizationPolicyToJson } from "../../../src/server/contexts/organizations/organizationPolicyToJson.js"
import { organizationPolicyType } from "../../../src/server/contexts/organizations/organizationPolicyType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const organizationUuid = "00000000-0000-4000-8000-000000000301"
const policyUuid = "00000000-0000-4000-8000-000000000302"
const secondPolicyUuid = "00000000-0000-4000-8000-000000000303"
const userUuid = "00000000-0000-4000-8000-000000000304"
const secondOrganizationUuid = "00000000-0000-4000-8000-000000000305"
const secondMembershipUuid = "00000000-0000-4000-8000-000000000306"
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
  return result.data
}

function userInsert(database: DatabaseConnection, uuid: string): void {
  database.run(
    `INSERT INTO users (
       uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      "2026-08-27T00:00:00.000Z",
      "2026-08-27T00:00:00.000Z",
      `${uuid}@example.com`,
      "User",
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      "akey",
      "stamp",
    ],
  )
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization policies persist, update by organization and type, serialize, and delete", () => {
  const database = databaseCreate()
  const policy = organizationPolicyCreate(
    organizationUuid,
    organizationPolicyType.resetPassword,
    identifierTestCreate([policyUuid]),
    true,
    JSON.stringify({ autoEnrollEnabled: true }),
  )

  expect(organizationPolicySave(database, policy)).toEqual({ success: true, data: undefined })
  expect(
    organizationPolicyFindByOrganizationAndType(database, organizationUuid, organizationPolicyType.resetPassword),
  ).toEqual({
    success: true,
    data: policy,
  })
  expect(organizationPolicyToJson(policy)).toEqual({
    id: policyUuid,
    organizationId: organizationUuid,
    type: organizationPolicyType.resetPassword,
    data: { autoEnrollEnabled: true },
    enabled: true,
    revisionDate: "1970-01-01T00:00:00.000Z",
    object: "policy",
    canToggleState: true,
  })

  const updatedPolicy = { ...policy, data: "invalid-json", enabled: false }
  expect(organizationPolicySave(database, updatedPolicy)).toEqual({ success: true, data: undefined })
  expect(organizationPolicyFindByOrganization(database, organizationUuid)).toEqual({
    success: true,
    data: [updatedPolicy],
  })
  expect(organizationPolicyToJson(updatedPolicy)).toMatchObject({ data: null, enabled: false })

  const secondPolicy = organizationPolicyCreate(
    organizationUuid,
    organizationPolicyType.masterPassword,
    identifierTestCreate([secondPolicyUuid]),
    true,
    "null",
  )
  expect(organizationPolicySave(database, secondPolicy)).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT COUNT(*) AS count FROM org_policies WHERE org_uuid = ?").get(organizationUuid)).toEqual(
    {
      count: 2,
    },
  )
  expect(organizationPolicyDelete(database, policyUuid)).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT COUNT(*) AS count FROM org_policies WHERE org_uuid = ?").get(organizationUuid)).toEqual(
    {
      count: 1,
    },
  )
  expect(organizationPolicyDeleteAllByOrganization(database, organizationUuid)).toEqual({
    success: true,
    data: undefined,
  })
  expect(database.query("SELECT COUNT(*) AS count FROM org_policies").get()).toEqual({ count: 0 })
})

test("organization policy enforcement applies only to non-admin organization members", () => {
  const database = databaseCreate()
  userInsert(database, userUuid)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    secondOrganizationUuid,
    "Second organization",
    "second@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [secondMembershipUuid, userUuid, secondOrganizationUuid, 0, "key", 2, 2],
  )
  const policy = organizationPolicyCreate(
    secondOrganizationUuid,
    organizationPolicyType.singleOrganization,
    identifierTestCreate([secondPolicyUuid]),
    true,
  )
  expect(organizationPolicySave(database, policy).success).toBe(true)
  expect(organizationPolicyIsApplicableToUser(database, userUuid, organizationPolicyType.singleOrganization)).toEqual({
    success: true,
    data: true,
  })
  expect(
    organizationPolicyIsApplicableToUser(
      database,
      userUuid,
      organizationPolicyType.singleOrganization,
      secondOrganizationUuid,
    ),
  ).toEqual({ success: true, data: false })

  const member = {
    accessAll: false,
    akey: "key",
    externalId: null,
    invitedByEmail: null,
    organizationUuid,
    resetPasswordKey: null,
    status: 1,
    type: 2,
    userUuid,
    uuid: "00000000-0000-4000-8000-000000000307",
  } as const
  expect(organizationPolicyCheckUserAllowed(database, member, "accept").success).toBe(false)

  const ownerMembership = { ...member, type: 0, uuid: "00000000-0000-4000-8000-000000000308" }
  expect(organizationPolicyCheckUserAllowed(database, ownerMembership, "accept")).toEqual({
    success: true,
    data: undefined,
  })
})

test("send options policy disables hide-email for applicable users", () => {
  const database = databaseCreate()
  userInsert(database, userUuid)
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["00000000-0000-4000-8000-000000000309", userUuid, organizationUuid, 0, "key", 2, 2],
  )
  const policy = organizationPolicyCreate(
    organizationUuid,
    organizationPolicyType.sendOptions,
    identifierTestCreate(["00000000-0000-4000-8000-00000000030a"]),
    true,
    JSON.stringify({ disableHideEmail: true }),
  )
  expect(organizationPolicySave(database, policy).success).toBe(true)
  expect(organizationPolicyIsHideEmailDisabled(database, userUuid)).toEqual({ success: true, data: true })
})

test("pending memberships do not inherit active organization policies", () => {
  const database = databaseCreate()
  userInsert(database, userUuid)
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["00000000-0000-4000-8000-00000000030b", userUuid, organizationUuid, 0, "key", 1, 2],
  )
  const policy = organizationPolicyCreate(
    organizationUuid,
    organizationPolicyType.personalOwnership,
    identifierTestCreate(["00000000-0000-4000-8000-00000000030c"]),
    true,
  )
  expect(organizationPolicySave(database, policy)).toEqual({ success: true, data: undefined })
  expect(organizationPolicyIsApplicableToUser(database, userUuid, organizationPolicyType.personalOwnership)).toEqual({
    success: true,
    data: false,
  })
})
