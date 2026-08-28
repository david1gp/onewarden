import { afterEach, expect, test } from "bun:test"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { identityTokenKeyPairResolve } from "../../../src/server/contexts/identity/identityTokenKeyPairResolve.js"

const databases: Array<Parameters<typeof databaseClose>[0]> = []

function databaseCreate() {
  const result = databaseTestCreate()
  expect(result.success).toBe(true)
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("identityTokenKeyPairResolve persists and reloads one signing key pair", () => {
  const database = databaseCreate()
  const first = identityTokenKeyPairResolve(database)
  const second = identityTokenKeyPairResolve(database)

  expect(first.success).toBe(true)
  expect(second.success).toBe(true)
  if (!first.success || !second.success) return
  expect(second.data.privateKeyPem).toBe(first.data.privateKeyPem)
  expect(second.data.publicKeyPem).toBe(first.data.publicKeyPem)
  expect(database.query("SELECT id FROM identity_signing_keys").all()).toEqual([{ id: 1 }])
})

test("identityTokenKeyPairResolve does not silently replace corrupted persisted keys", () => {
  const database = databaseCreate()
  database.run("INSERT INTO identity_signing_keys (id, private_key_pem, public_key_pem) VALUES (1, ?, ?)", [
    "not-a-private-key",
    "not-a-public-key",
  ])

  expect(identityTokenKeyPairResolve(database)).toMatchObject({
    success: false,
    op: "identityTokenKeyPairResolve",
    errorMessage: "Registration verification key loading failed.",
  })
})
