import { afterEach, expect, test } from "bun:test"
import { identitySsoAuthPurge } from "../../../src/server/contexts/identity/identitySsoAuthPurge.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const now = "2026-08-31T00:00:00.000Z"
const expired = "2026-08-30T23:49:59.999Z"
const expiryBoundary = "2026-08-30T23:50:00.000Z"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function authInsert(database: DatabaseConnection, state: string, createdAt: string): void {
  database.run(
    `INSERT INTO sso_auth (state, client_challenge, nonce, redirect_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [state, "challenge", "nonce", "https://vault.example/sso", createdAt, createdAt],
  )
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("identitySsoAuthPurge strictly removes only SSO state older than ten minutes and is idempotent", () => {
  const database = databaseCreate()
  authInsert(database, "expired-state", expired)
  authInsert(database, "boundary-state", expiryBoundary)
  authInsert(database, "fresh-state", now)

  expect(identitySsoAuthPurge(database, clockTestCreate(now))).toEqual({ success: true, data: 1 })
  expect(database.query("SELECT state FROM sso_auth ORDER BY state").all()).toEqual([
    { state: "boundary-state" },
    { state: "fresh-state" },
  ])
  expect(identitySsoAuthPurge(database, clockTestCreate(now))).toEqual({ success: true, data: 0 })
})

test("identitySsoAuthPurge removes at most one bounded batch and retries remaining state", () => {
  const database = databaseCreate()
  for (let index = 0; index < 101; index += 1) authInsert(database, `batch-state-${index}`, expired)

  expect(identitySsoAuthPurge(database, clockTestCreate(now))).toEqual({ success: true, data: 100 })
  expect(database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 1 })
  expect(identitySsoAuthPurge(database, clockTestCreate(now))).toEqual({ success: true, data: 1 })
  expect(identitySsoAuthPurge(database, clockTestCreate(now))).toEqual({ success: true, data: 0 })
})
