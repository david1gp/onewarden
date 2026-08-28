import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const date = "2026-08-28T00:00:00.000Z"
const databases: DatabaseConnection[] = []

function userCreate(uuid: string, email: string, name: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: date,
    updatedAt: date,
    verifiedAt: date,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name,
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: `${uuid}-akey`,
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: "#123456",
    externalId: null,
  }
}

function deviceCreate(uuid: string, userUuid: string): IdentityDevice {
  return {
    uuid,
    createdAt: date,
    updatedAt: date,
    userUuid,
    name: `${uuid} device`,
    type: 7,
    pushUuid: `${uuid}-push`,
    pushToken: `${uuid}-token`,
    refreshToken: `${uuid}-refresh`,
    twoFactorRemember: null,
  }
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  grantor: IdentityUser
  grantee: IdentityUser
  grantorToken: string
  granteeToken: string
  mail: ReturnType<typeof identityMailAdapterCreate>
  notifications: Array<{ event: string; status: number | null }>
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const grantor = userCreate("grantor", "grantor@example.com", "Grantor")
  const grantee = userCreate("grantee", "grantee@example.com", "Grantee")
  for (const user of [grantor, grantee]) {
    const saveResult = identityUserSave(database, user)
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  const clock = clockTestCreate(date)
  const grantorDevice = deviceCreate("grantor-device", grantor.uuid)
  grantorDevice.twoFactorRemember = "remembered-two-factor"
  const devices = [grantorDevice, deviceCreate("grantee-device", grantee.uuid)]
  for (const device of devices) {
    const saveResult = identityDeviceSave(database, device, clock, false)
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  const config = identityConfigCreate({ MAIL_ENABLED: true, PASSWORD_ITERATIONS: 100_000 })
  const grantorTokenResult = await identityTokenBundleCreate(
    grantor,
    devices[0] as IdentityDevice,
    "web",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  const granteeTokenResult = await identityTokenBundleCreate(
    grantee,
    devices[1] as IdentityDevice,
    "web",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!grantorTokenResult.success || !granteeTokenResult.success) throw new Error("token creation failed")
  const mail = identityMailAdapterCreate(clock)
  const notifications: Array<{ event: string; status: number | null }> = []
  const app = serverAppCreate({
    clock,
    database,
    emergencyAccess: {
      notification: {
        sendEmergencyAccessUpdate: (notification) => {
          notifications.push(notification)
        },
      },
    },
    identity: {
      clock,
      config,
      database,
      identifier: identifierTestCreate(["emergency-1", "emergency-security-stamp"]),
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate<void>(undefined) },
    },
  })
  return {
    app,
    database,
    grantor,
    grantee,
    grantorToken: grantorTokenResult.data.accessToken,
    granteeToken: granteeTokenResult.data.accessToken,
    mail,
    notifications,
  }
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

async function jsonRequest(
  app: ReturnType<typeof serverAppCreate>,
  path: string,
  method: string,
  body: unknown,
  token: string,
): Promise<Response> {
  return app.request(`https://vault.example${path}`, {
    body: JSON.stringify(body),
    headers: headers(token),
    method,
  })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("emergency access invite, accept, confirm, recover, view, takeover, and aliases match the API", async () => {
  const context = await contextCreate()
  const invite = await jsonRequest(
    context.app,
    "/api/emergency-access/invite",
    "POST",
    { email: context.grantee.email, type: "View", waitTimeDays: 1 },
    context.grantorToken,
  )
  expect(invite.status).toBe(200)
  const inviteMessage = context.mail.messages.at(-1)
  expect(inviteMessage).toMatchObject({ kind: "emergencyAccessInvite", recipient: context.grantee.email })
  if (inviteMessage === undefined || inviteMessage.token === null || inviteMessage.targetEmail === null) return
  const emergencyAccessId = inviteMessage.targetEmail

  const trusted = await context.app.request("https://vault.example/api/emergency-access/trusted", {
    headers: { authorization: `Bearer ${context.grantorToken}` },
  })
  expect(trusted.status).toBe(200)
  expect((await trusted.json()).data[0]).toMatchObject({
    id: emergencyAccessId,
    status: 0,
    type: 0,
    granteeId: context.grantee.uuid,
    object: "emergencyAccessGranteeDetails",
  })

  const accept = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/accept`,
    "POST",
    { token: inviteMessage.token },
    context.granteeToken,
  )
  expect(accept.status).toBe(200)
  expect(context.mail.messages.at(-1)?.kind).toBe("emergencyAccessInviteAccepted")

  const confirm = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/confirm`,
    "POST",
    { key: "encrypted-grantor-key" },
    context.grantorToken,
  )
  expect(confirm.status).toBe(200)
  expect(await confirm.json()).toMatchObject({ status: 2, object: "emergencyAccess" })

  const initiate = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/initiate`,
    "POST",
    {},
    context.granteeToken,
  )
  expect(initiate.status).toBe(200)
  expect(await initiate.json()).toMatchObject({ status: 3 })

  const reject = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/reject`,
    "POST",
    {},
    context.grantorToken,
  )
  expect(reject.status).toBe(200)
  expect(await reject.json()).toMatchObject({ status: 2 })

  await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/initiate`,
    "POST",
    {},
    context.granteeToken,
  )
  const approve = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/approve`,
    "POST",
    {},
    context.grantorToken,
  )
  expect(approve.status).toBe(200)
  expect(await approve.json()).toMatchObject({ status: 4 })

  const view = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/view`,
    "POST",
    {},
    context.granteeToken,
  )
  expect(view.status).toBe(200)
  expect(await view.json()).toEqual({
    ciphers: [],
    keyEncrypted: "encrypted-grantor-key",
    object: "emergencyAccessView",
  })

  const update = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}`,
    "POST",
    { type: "Takeover", waitTimeDays: 2 },
    context.grantorToken,
  )
  expect(update.status).toBe(200)
  expect(await update.json()).toMatchObject({ status: 4, type: 1, waitTimeDays: 2 })

  const takeover = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/takeover`,
    "POST",
    {},
    context.granteeToken,
  )
  expect(takeover.status).toBe(200)
  expect(await takeover.json()).toMatchObject({
    kdf: 0,
    keyEncrypted: "encrypted-grantor-key",
    object: "emergencyAccessTakeover",
  })

  const password = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/password`,
    "POST",
    { key: "new-grantor-key", newMasterPasswordHash: "new-master-password-hash" },
    context.granteeToken,
  )
  expect(password.status).toBe(200)
  expect(
    context.database
      .query<{ twofactor_remember: string | null }, [string]>(
        "SELECT twofactor_remember FROM devices WHERE user_uuid = ?",
      )
      .all(context.grantor.uuid),
  ).toEqual([{ twofactor_remember: null }])

  const policies = await context.app.request(
    `https://vault.example/api/emergency-access/${emergencyAccessId}/policies`,
    {
      headers: { authorization: `Bearer ${context.granteeToken}` },
    },
  )
  expect(policies.status).toBe(200)
  expect(await policies.json()).toEqual({ data: [], object: "list", continuationToken: null })

  const remove = await jsonRequest(
    context.app,
    `/api/emergency-access/${emergencyAccessId}/delete`,
    "POST",
    {},
    context.granteeToken,
  )
  expect(remove.status).toBe(200)
  expect(context.notifications.map((notification) => notification.event)).toEqual([
    "created",
    "accepted",
    "confirmed",
    "initiated",
    "rejected",
    "initiated",
    "approved",
    "updated",
    "deleted",
  ])
})

test("disabled emergency access returns an empty list but rejects mutations", async () => {
  const context = await contextCreate()
  const app = serverAppCreate({
    clock: clockTestCreate(date),
    database: context.database,
    identity: {
      config: identityConfigCreate({ EMERGENCY_ACCESS_ALLOWED: false }),
      database: context.database,
      identifier: identifierTestCreate(),
      mail: context.mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate<void>(undefined) },
    },
  })
  const trusted = await app.request("https://vault.example/api/emergency-access/trusted", {
    headers: { authorization: `Bearer ${context.grantorToken}` },
  })
  expect(trusted.status).toBe(200)
  expect(await trusted.json()).toEqual({ data: [], object: "list", continuationToken: null })
  const invite = await jsonRequest(
    app,
    "/api/emergency-access/invite",
    "POST",
    { email: context.grantee.email, type: 0, waitTimeDays: 1 },
    context.grantorToken,
  )
  expect(invite.status).toBe(400)
  expect(await invite.json()).toMatchObject({ message: "Emergency access is not enabled." })
})
