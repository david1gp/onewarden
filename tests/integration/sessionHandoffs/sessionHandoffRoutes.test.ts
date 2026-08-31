import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { sessionHandoffConsume } from "../../../src/server/contexts/sessionHandoffs/sessionHandoffConsume.js"
import { sessionHandoffPurge } from "../../../src/server/contexts/sessionHandoffs/sessionHandoffPurge.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { sessionHandoffConsumeResponseSchema } from "../../../src/shared/sessionHandoff/sessionHandoffConsumeResponseSchema.js"
import { sessionHandoffUserKeyDecrypt } from "../../../src/shared/sessionHandoff/sessionHandoffUserKeyDecrypt.js"
import { sessionHandoffUserKeyEncrypt } from "../../../src/shared/sessionHandoff/sessionHandoffUserKeyEncrypt.js"
import { identityTestDeviceCreate } from "../../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

type HandoffTestContext = Awaited<ReturnType<typeof contextCreate>>

async function contextCreate() {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  let now = new Date("2026-08-31T12:00:00.000Z")
  const clock: Clock = { now: () => new Date(now) }
  const user = identityTestUserCreate("handoff-user", { name: "Handoff User", passwordIterations: 600_000 })
  user.akey = "master-key-encrypted-user-key"
  const device = identityTestDeviceCreate(user.uuid, {
    uuid: "extension-device",
    name: "Extension",
    pushUuid: null,
    pushToken: null,
  })
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clock, false).success).toBe(true)
  const config = identityConfigCreate()
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "browser",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config,
      database,
      identifier: identifierTestCreate(["handoff-push-id"]),
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
    },
  })
  return {
    app,
    clock,
    config,
    database,
    token: tokenResult.data.accessToken,
    userKey: new Uint8Array(64).map((_, index) => index),
    advance(milliseconds: number) {
      now = new Date(now.getTime() + milliseconds)
    },
  }
}

async function handoffCreate(
  context: HandoffTestContext,
  operation: "create" | "edit" = "create",
  cipherId: string | null = null,
) {
  const encryptedResult = await sessionHandoffUserKeyEncrypt(context.userKey, operation, cipherId)
  if (!encryptedResult.success) throw new Error(encryptedResult.errorMessage)
  const response = await context.app.request("https://vault.example/api/extension/handoffs", {
    method: "POST",
    headers: { authorization: `Bearer ${context.token}`, "content-type": "application/json" },
    body: JSON.stringify({ operation, cipherId, encryptedUserKey: encryptedResult.data.encryptedUserKey }),
  })
  const body = (await response.json()) as { token: string; expiresAt: string }
  return { response, body, transferKey: encryptedResult.data.transferKey }
}

function handoffConsume(
  context: HandoffTestContext,
  token: string,
  operation: "create" | "edit" = "create",
  cipherId: string | null = null,
  deviceIdentifier = "web-device",
) {
  return context.app.request("https://vault.example/api/extension/handoffs/consume", {
    method: "POST",
    headers: { authorization: `Handoff ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ operation, cipherId, deviceIdentifier }),
  })
}

function editableCipherInsert(database: DatabaseConnection, userUuid: string, cipherUuid: string): void {
  const date = "2026-08-31T12:00:00.000Z"
  database.run(
    `INSERT INTO ciphers (
       uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
       name, notes, fields, data, password_history, deleted_at, reprompt, wire_data
     ) VALUES (?, ?, ?, ?, NULL, NULL, 1, ?, NULL, NULL, ?, NULL, NULL, 0, NULL)`,
    [cipherUuid, date, date, userUuid, "encrypted-name", "{}"],
  )
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("authenticated handoff creation stores only a hash and consumption transfers a normal web session", async () => {
  const context = await contextCreate()
  const created = await handoffCreate(context)
  expect(created.response.status).toBe(200)
  expect(Date.parse(created.body.expiresAt) - context.clock.now().getTime()).toBe(45_000)
  const row = context.database
    .query<{ source_device_uuid: string; token_hash: string; user_uuid: string }, []>(
      "SELECT source_device_uuid, token_hash, user_uuid FROM extension_session_handoffs",
    )
    .get()
  expect(row).toMatchObject({ source_device_uuid: "extension-device", user_uuid: "handoff-user" })
  expect(row?.token_hash).not.toBe(created.body.token)
  expect(JSON.stringify(row)).not.toContain(created.body.token)

  const consumed = await handoffConsume(context, created.body.token)
  expect(consumed.status).toBe(200)
  const parsed = v.safeParse(sessionHandoffConsumeResponseSchema, await consumed.json())
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.output).toMatchObject({
    operation: "create",
    cipherId: null,
    email: "handoff-user@example.com",
    userId: "handoff-user",
    encryptedUserKey: "master-key-encrypted-user-key",
  })
  const decryptedResult = await sessionHandoffUserKeyDecrypt(
    parsed.output.userKeyTransfer,
    created.transferKey,
    parsed.output.operation,
    parsed.output.cipherId,
  )
  expect(decryptedResult.success).toBe(true)
  if (decryptedResult.success) expect(decryptedResult.data).toEqual(context.userKey)
  expect(context.database.query("SELECT 1 FROM extension_session_handoffs").get()).toBeNull()
  expect(
    context.database.query("SELECT 1 FROM devices WHERE uuid = 'web-device' AND user_uuid = 'handoff-user'").get(),
  ).not.toBeNull()
})

test("handoff consume is atomic and rejects sequential and concurrent replay", async () => {
  const context = await contextCreate()
  const first = await handoffCreate(context)
  expect((await handoffConsume(context, first.body.token)).status).toBe(200)
  expect((await handoffConsume(context, first.body.token)).status).toBe(401)

  const concurrent = await handoffCreate(context)
  const responses = await Promise.all([
    handoffConsume(context, concurrent.body.token, "create", null, "web-device-two"),
    handoffConsume(context, concurrent.body.token, "create", null, "web-device-three"),
  ])
  expect(responses.map((response) => response.status).sort()).toEqual([200, 401])
})

test("handoff remains consumable when session issuance fails before the atomic claim", async () => {
  const context = await contextCreate()
  const created = await handoffCreate(context)
  const failed = await sessionHandoffConsume(
    created.body.token,
    { operation: "create", cipherId: null, deviceIdentifier: "failed-web-device" },
    {
      clock: context.clock,
      config: context.config,
      database: context.database,
      identifier: identifierTestCreate(["failed-push-id"]),
      issuer: "https://vault.example",
      privateKey: undefined,
    },
  )
  expect(failed.success).toBe(false)
  expect(context.database.query("SELECT 1 FROM extension_session_handoffs").get()).not.toBeNull()
  expect((await handoffConsume(context, created.body.token)).status).toBe(200)
})

test("handoffs enforce operation, cipher, source device, and expiry bindings", async () => {
  const context = await contextCreate()
  editableCipherInsert(context.database, "handoff-user", "cipher-one")
  const edit = await handoffCreate(context, "edit", "cipher-one")
  expect(edit.response.status).toBe(200)
  expect((await handoffConsume(context, edit.body.token, "create", null)).status).toBe(401)
  expect((await handoffConsume(context, edit.body.token, "edit", "cipher-two")).status).toBe(401)
  expect((await handoffConsume(context, edit.body.token, "edit", "cipher-one")).status).toBe(200)

  const deviceBound = await handoffCreate(context)
  context.database.run("DELETE FROM devices WHERE uuid = ? AND user_uuid = ?", ["extension-device", "handoff-user"])
  expect((await handoffConsume(context, deviceBound.body.token, "create", null, "another-web-device")).status).toBe(401)

  const secondContext = await contextCreate()
  const expired = await handoffCreate(secondContext)
  secondContext.advance(45_000)
  expect((await handoffConsume(secondContext, expired.body.token)).status).toBe(401)
  expect(sessionHandoffPurge(secondContext.database, secondContext.clock)).toEqual({ success: true, data: 1 })
})

test("handoff routes require bearer or one-time handoff authentication", async () => {
  const context = await contextCreate()
  const encryptedResult = await sessionHandoffUserKeyEncrypt(context.userKey, "create", null)
  if (!encryptedResult.success) throw new Error(encryptedResult.errorMessage)
  const unauthenticatedCreate = await context.app.request("https://vault.example/api/extension/handoffs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      operation: "create",
      cipherId: null,
      encryptedUserKey: encryptedResult.data.encryptedUserKey,
    }),
  })
  expect(unauthenticatedCreate.status).toBe(401)
  const unauthenticatedConsume = await context.app.request("https://vault.example/api/extension/handoffs/consume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  expect(unauthenticatedConsume.status).toBe(401)
})
