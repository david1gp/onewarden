import { afterEach, expect, test } from "bun:test"
import { identityAuthRequestDelete } from "../../../src/server/contexts/identity/identityAuthRequestDelete.js"
import { identityAuthRequestFindByUser } from "../../../src/server/contexts/identity/identityAuthRequestFindByUser.js"
import { identityAuthRequestFindByUserAndRequestedDevice } from "../../../src/server/contexts/identity/identityAuthRequestFindByUserAndRequestedDevice.js"
import { identityAuthRequestFindByUuid } from "../../../src/server/contexts/identity/identityAuthRequestFindByUuid.js"
import { identityAuthRequestFindByUuidAndUser } from "../../../src/server/contexts/identity/identityAuthRequestFindByUuidAndUser.js"
import { identityAuthRequestFindPendingByUserAndDevice } from "../../../src/server/contexts/identity/identityAuthRequestFindPendingByUserAndDevice.js"
import type { IdentityAuthRequest } from "../../../src/server/contexts/identity/identityAuthRequest.js"
import { identityAuthRequestSave } from "../../../src/server/contexts/identity/identityAuthRequestSave.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function authRequestCreate(overrides: Partial<IdentityAuthRequest> = {}): IdentityAuthRequest {
  return {
    uuid: "auth-request-one",
    userUuid: "auth-request-user",
    organizationUuid: null,
    requestDeviceIdentifier: "request-device-one",
    deviceType: 7,
    requestIp: "192.0.2.10",
    responseDeviceId: null,
    accessCode: "access-code-one",
    publicKey: "public-key-one",
    encKey: null,
    masterPasswordHash: null,
    approved: null,
    creationDate: "2026-08-28T00:00:00.000Z",
    responseDate: null,
    authenticationDate: null,
    ...overrides,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("auth request migration defines upstream columns, nullable response values, indexes, and foreign keys", () => {
  const database = databaseCreate()
  const columns = database
    .query<{ name: string; type: string; notnull: number; pk: number }, []>("PRAGMA table_info(auth_requests)")
    .all()
    .map(({ name, type, notnull, pk }) => ({ name, type, notnull, pk }))

  expect(columns).toEqual([
    { name: "uuid", type: "TEXT", notnull: 1, pk: 1 },
    { name: "user_uuid", type: "TEXT", notnull: 1, pk: 0 },
    { name: "organization_uuid", type: "TEXT", notnull: 0, pk: 0 },
    { name: "request_device_identifier", type: "TEXT", notnull: 1, pk: 0 },
    { name: "device_type", type: "INTEGER", notnull: 1, pk: 0 },
    { name: "request_ip", type: "TEXT", notnull: 1, pk: 0 },
    { name: "response_device_id", type: "TEXT", notnull: 0, pk: 0 },
    { name: "access_code", type: "TEXT", notnull: 1, pk: 0 },
    { name: "public_key", type: "TEXT", notnull: 1, pk: 0 },
    { name: "enc_key", type: "TEXT", notnull: 0, pk: 0 },
    { name: "master_password_hash", type: "TEXT", notnull: 0, pk: 0 },
    { name: "approved", type: "BOOLEAN", notnull: 0, pk: 0 },
    { name: "creation_date", type: "DATETIME", notnull: 1, pk: 0 },
    { name: "response_date", type: "DATETIME", notnull: 0, pk: 0 },
    { name: "authentication_date", type: "DATETIME", notnull: 0, pk: 0 },
  ])
  expect(database.query("PRAGMA foreign_key_list(auth_requests)").all()).toEqual([
    {
      id: 0,
      seq: 0,
      table: "organizations",
      from: "organization_uuid",
      to: "uuid",
      on_update: "NO ACTION",
      on_delete: "NO ACTION",
      match: "NONE",
    },
    {
      id: 1,
      seq: 0,
      table: "users",
      from: "user_uuid",
      to: "uuid",
      on_update: "NO ACTION",
      on_delete: "NO ACTION",
      match: "NONE",
    },
  ])
  expect(
    database
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'auth_requests_%' ORDER BY name",
      )
      .all(),
  ).toEqual([
    { name: "auth_requests_organization_uuid_index" },
    { name: "auth_requests_pending_device_index" },
    { name: "auth_requests_user_uuid_index" },
  ])
})

test("auth request save and find round-trip every field and enforce user scoping", () => {
  const database = databaseCreate()
  const user = identityTestUserCreate("auth-request-user", { name: "Auth request user", passwordIterations: 100_000 })
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "auth-request-organization",
    "Auth request organization",
    "auth-request@example.com",
  ])

  const request = authRequestCreate({ organizationUuid: "auth-request-organization" })
  expect(identityAuthRequestSave(database, request)).toEqual({ success: true, data: undefined })
  expect(identityAuthRequestFindByUuid(database, request.uuid)).toEqual({ success: true, data: request })
  expect(identityAuthRequestFindByUuidAndUser(database, request.uuid, request.userUuid)).toEqual({
    success: true,
    data: request,
  })
  expect(identityAuthRequestFindByUuidAndUser(database, request.uuid, "another-user")).toEqual({
    success: true,
    data: null,
  })

  const response = authRequestCreate({
    organizationUuid: "auth-request-organization",
    encKey: "encrypted-key",
    masterPasswordHash: "master-password-hash",
    approved: false,
    responseDeviceId: "response-device-one",
    responseDate: "2026-08-28T00:01:00.000Z",
    authenticationDate: "2026-08-28T00:02:00.000Z",
  })
  expect(identityAuthRequestSave(database, response)).toEqual({ success: true, data: undefined })
  expect(identityAuthRequestFindByUuid(database, request.uuid)).toEqual({ success: true, data: response })
  expect(identityAuthRequestFindByUser(database, request.userUuid)).toEqual({ success: true, data: [response] })

  expect(identityAuthRequestDelete(database, response)).toEqual({ success: true, data: undefined })
  expect(identityAuthRequestFindByUuid(database, request.uuid)).toEqual({ success: true, data: null })
  expect(identityAuthRequestDelete(database, "missing-auth-request")).toEqual({ success: true, data: undefined })
})

test("pending auth request lookup filters approved requests and returns the newest matching device request", () => {
  const database = databaseCreate()
  const user = identityTestUserCreate("pending-auth-user", { name: "Pending auth user", passwordIterations: 100_000 })
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })

  const older = authRequestCreate({
    uuid: "pending-older",
    userUuid: user.uuid,
    requestDeviceIdentifier: "pending-device",
    creationDate: "2026-08-28T00:00:00.000Z",
  })
  const newer = authRequestCreate({
    uuid: "pending-newer",
    userUuid: user.uuid,
    requestDeviceIdentifier: "pending-device",
    creationDate: "2026-08-28T00:02:00.000Z",
  })
  const approved = authRequestCreate({
    uuid: "pending-approved",
    userUuid: user.uuid,
    requestDeviceIdentifier: "pending-device",
    approved: false,
    creationDate: "2026-08-28T00:03:00.000Z",
  })
  const otherDevice = authRequestCreate({
    uuid: "pending-other-device",
    userUuid: user.uuid,
    requestDeviceIdentifier: "other-device",
    creationDate: "2026-08-28T00:04:00.000Z",
  })
  for (const request of [older, newer, approved, otherDevice]) {
    expect(identityAuthRequestSave(database, request)).toEqual({ success: true, data: undefined })
  }

  expect(identityAuthRequestFindByUser(database, user.uuid)).toEqual({
    success: true,
    data: [older, newer, approved, otherDevice],
  })
  expect(identityAuthRequestFindByUserAndRequestedDevice(database, user.uuid, "pending-device")).toEqual({
    success: true,
    data: newer,
  })
  expect(identityAuthRequestFindPendingByUserAndDevice(database, user.uuid, "pending-device")).toEqual({
    success: true,
    data: newer,
  })
  expect(identityAuthRequestFindByUserAndRequestedDevice(database, user.uuid, "missing-device")).toEqual({
    success: true,
    data: null,
  })
})
