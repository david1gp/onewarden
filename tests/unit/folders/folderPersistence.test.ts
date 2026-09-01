import { afterEach, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { folderCreate } from "../../../src/server/contexts/folders/folderCreate.js"
import { folderDelete } from "../../../src/server/contexts/folders/folderDelete.js"
import { folderFindByUser } from "../../../src/server/contexts/folders/folderFindByUser.js"
import { folderFindByUuidAndUser } from "../../../src/server/contexts/folders/folderFindByUuidAndUser.js"
import { folderUpdate } from "../../../src/server/contexts/folders/folderUpdate.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { foldersCiphers } from "../../../src/server/database/schema/foldersCiphers.js"
import { type UserInsert, users } from "../../../src/server/database/schema/users.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userCreate(database: DatabaseConnection, uuid: string): void {
  const values: UserInsert = {
    uuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    email: `${uuid}@example.com`,
    name: uuid,
    passwordHash: Buffer.from([]),
    salt: Buffer.from([]),
    passwordIterations: 600_000,
    akey: "akey",
    securityStamp: `${uuid}-stamp`,
  }
  database.drizzle.insert(users).values(values).run()
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("folder persistence scopes CRUD by user, preserves database ordering, advances revisions, and cleans mappings", () => {
  const database = databaseCreate()
  userCreate(database, "folder-user")
  userCreate(database, "other-user")

  const first = folderCreate(
    database,
    "folder-user",
    "First",
    clockTestCreate("2026-08-28T00:00:01.000Z"),
    identifierTestCreate(["folder-one"]),
  )
  const second = folderCreate(
    database,
    "folder-user",
    "Second",
    clockTestCreate("2026-08-28T00:00:02.000Z"),
    identifierTestCreate(["folder-two"]),
  )
  const other = folderCreate(
    database,
    "other-user",
    "Other",
    clockTestCreate("2026-08-28T00:00:03.000Z"),
    identifierTestCreate(["other-folder"]),
  )
  expect(first.success).toBe(true)
  expect(second.success).toBe(true)
  expect(other.success).toBe(true)
  if (!first.success || !second.success || !other.success) return

  expect(folderFindByUser(database, "folder-user")).toEqual({
    success: true,
    data: [first.data, second.data],
  })
  expect(
    database.drizzle.select({ updatedAt: users.updatedAt }).from(users).where(eq(users.uuid, "folder-user")).get(),
  ).toEqual({
    updatedAt: "2026-08-28T00:00:02.000Z",
  })

  const update = folderUpdate(
    database,
    first.data.uuid,
    "folder-user",
    "Renamed",
    clockTestCreate("2026-08-28T00:00:04.000Z"),
  )
  expect(update).toEqual({
    success: true,
    data: { ...first.data, name: "Renamed", updatedAt: "2026-08-28T00:00:04.000Z" },
  })
  expect(
    database.drizzle.select({ updatedAt: users.updatedAt }).from(users).where(eq(users.uuid, "folder-user")).get(),
  ).toEqual({
    updatedAt: "2026-08-28T00:00:04.000Z",
  })

  database.drizzle
    .insert(foldersCiphers)
    .values([
      { cipherUuid: "cipher-one", folderUuid: first.data.uuid },
      { cipherUuid: "cipher-two", folderUuid: first.data.uuid },
    ])
    .run()
  const deleted = folderDelete(database, first.data.uuid, "folder-user", clockTestCreate("2026-08-28T00:00:05.000Z"))
  expect(deleted).toEqual({
    success: true,
    data: { ...first.data, name: "Renamed", updatedAt: "2026-08-28T00:00:04.000Z" },
  })
  expect(
    database.drizzle.select().from(foldersCiphers).where(eq(foldersCiphers.folderUuid, first.data.uuid)).all(),
  ).toEqual([])
  expect(folderFindByUuidAndUser(database, first.data.uuid, "folder-user")).toEqual({ success: true, data: null })
  expect(
    database.drizzle.select({ updatedAt: users.updatedAt }).from(users).where(eq(users.uuid, "folder-user")).get(),
  ).toEqual({
    updatedAt: "2026-08-28T00:00:05.000Z",
  })

  expect(
    folderUpdate(database, other.data.uuid, "folder-user", "No access", clockTestCreate(Date.now())),
  ).toMatchObject({
    success: false,
    errorMessage: "Invalid folder",
    code: "platform.invalid-request",
  })
  expect(folderDelete(database, other.data.uuid, "folder-user", clockTestCreate(Date.now()))).toMatchObject({
    success: false,
    errorMessage: "Invalid folder",
    code: "platform.invalid-request",
  })
  expect(folderFindByUuidAndUser(database, other.data.uuid, "other-user")).toEqual({ success: true, data: other.data })
})
