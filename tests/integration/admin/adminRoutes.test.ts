import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { eventType } from "../../../src/server/contexts/events/eventType.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { PushRelayAdapter } from "../../../src/server/contexts/push/pushRelayAdapter.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userCreate(uuid: string, email: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name: "Admin test user",
    passwordHash: new Uint8Array([1, 2, 3]),
    salt: new Uint8Array([4, 5, 6]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(userUuid: string): IdentityDevice {
  return {
    uuid: "admin-device",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Admin device",
    type: 7,
    pushUuid: "admin-push",
    pushToken: null,
    refreshToken: "admin-refresh",
    twoFactorRemember: null,
  }
}

function appCreate(
  database: DatabaseConnection,
  options: {
    identityConfig?: Parameters<typeof identityConfigCreate>[0]
    mail?: IdentityMailAdapter
    push?: PushRelayAdapter
  } = {},
) {
  let id = 0
  return serverAppCreate({
    clock: clockTestCreate("2026-08-28T12:00:00.000Z"),
    database,
    identifier: { uuid: () => `admin-generated-${++id}` },
    admin: {
      config: { ADMIN_TOKEN: "admin-secret", ADMIN_SESSION_LIFETIME: 10 },
      mail: options.mail,
      push: options.push,
    },
    identity: { config: identityConfigCreate(options.identityConfig) },
  })
}

async function adminLogin(app: ReturnType<typeof serverAppCreate>, token = "admin-secret"): Promise<string> {
  const response = await app.request("https://vault.example/admin/", {
    body: new URLSearchParams({ token }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(response.status).toBe(200)
  const cookie = response.headers.get("set-cookie")
  expect(cookie).toContain("VW_ADMIN=")
  if (cookie === null) throw new Error("Admin cookie was not returned")
  return cookie.split(";", 1)[0] ?? cookie
}

async function request(
  app: ReturnType<typeof serverAppCreate>,
  path: string,
  method: string,
  cookie: string | undefined,
  body?: unknown,
): Promise<Response> {
  return app.request(`https://vault.example${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie === undefined ? {} : { cookie }),
    },
    method,
  })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("admin disabled and enabled authentication preserve the upstream boundary", async () => {
  const disabled = serverAppCreate()
  const disabledResponse = await disabled.request("https://vault.example/admin/")
  expect(disabledResponse.status).toBe(200)
  expect(await disabledResponse.text()).toContain("admin panel is disabled")

  const database = databaseCreate()
  const app = appCreate(database)
  const invalid = await app.request("https://vault.example/admin/", {
    body: new URLSearchParams({ token: "wrong" }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(invalid.status).toBe(401)
  expect(await invalid.text()).toContain("Invalid admin token")

  const cookie = await adminLogin(app)
  const root = await app.request("https://vault.example/admin/", { headers: { cookie } })
  expect(root.status).toBe(200)
  expect(await root.text()).toContain("admin/settings")
  const unauthorized = await request(app, "/admin/users", "GET", undefined)
  expect(unauthorized.status).toBe(401)
  expect((await unauthorized.json()).message).toBe("Unauthorized")
  const expired = await request(app, "/admin/users", "GET", "VW_ADMIN=expired-token")
  expect(expired.status).toBe(401)
  expect(expired.headers.get("set-cookie")).toContain("VW_ADMIN=;")
})

test("admin invite, user listing, diagnostics, configuration, SMTP test, and backup use deterministic adapters", async () => {
  const database = databaseCreate()
  const mailCalls: string[] = []
  const mail: IdentityMailAdapter = {
    sendRegisterVerifyEmail: async () => resultCreate(undefined),
    sendWelcome: async () => resultCreate(undefined),
    sendWelcomeMustVerify: async () => resultCreate(undefined),
    sendInvite: async (email) => {
      mailCalls.push(`invite:${email}`)
      return resultCreate(undefined)
    },
    sendTest: async (email) => {
      mailCalls.push(`test:${email}`)
      return resultCreate(undefined)
    },
  }
  const app = appCreate(database, { identityConfig: { MAIL_ENABLED: true }, mail })
  const cookie = await adminLogin(app)

  const invite = await request(app, "/admin/invite", "POST", cookie, { email: "Invited@Example.com" })
  expect(invite.status).toBe(200)
  expect((await invite.json()).email).toBe("invited@example.com")
  expect(mailCalls).toEqual(["invite:invited@example.com"])
  expect(database.query("SELECT COUNT(*) AS count FROM invitations").get()).toEqual({ count: 0 })

  const conflict = await request(app, "/admin/invite", "POST", cookie, { email: "INVITED@example.com" })
  expect(conflict.status).toBe(409)
  expect((await conflict.json()).message).toBe("User already exists")
  const users = await request(app, "/admin/users", "GET", cookie)
  expect(users.status).toBe(200)
  expect((await users.json()) as unknown[]).toHaveLength(1)

  const smtp = await request(app, "/admin/test/smtp", "POST", cookie, { email: "test@example.com" })
  expect(smtp.status).toBe(200)
  expect(mailCalls).toContain("test:test@example.com")
  expect((await request(app, "/admin/diagnostics/config", "GET", cookie)).status).toBe(200)
  const config = await request(app, "/admin/config", "POST", cookie, { SIGNUPS_ALLOWED: false })
  expect(config.status).toBe(200)
  const diagnostics = await request(app, "/admin/diagnostics", "GET", cookie)
  expect(diagnostics.status).toBe(200)
  expect(await diagnostics.text()).toContain("admin/diagnostics")
  const http = await request(app, "/admin/diagnostics/http?code=418", "GET", cookie)
  expect(http.status).toBe(418)
  expect(await http.text()).toBe("Testing error 418 response")

  const backupApp = serverAppCreate({
    database,
    admin: {
      config: { ADMIN_TOKEN: "admin-secret" },
      backup: { create: () => resultCreate("/tmp/onewarden-backup.sqlite3") },
    },
  })
  const backupCookie = await adminLogin(backupApp)
  const backup = await request(backupApp, "/admin/config/backup_db", "POST", backupCookie)
  expect(backup.status).toBe(200)
  expect(await backup.text()).toBe("Backup to '/tmp/onewarden-backup.sqlite3' was successful")
})

test("admin deauthorization, membership compatibility, and organization deletion clean current foundations", async () => {
  const database = databaseCreate()
  const user = userCreate("admin-user", "admin-user@example.com")
  expect(identityUserSave(database, user).success).toBe(true)
  expect(
    identityDeviceSave(database, deviceCreate(user.uuid), clockTestCreate("2026-08-28T00:00:00.000Z"), false).success,
  ).toBe(true)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "admin-org",
    "Admin org",
    "org@example.com",
  ])
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?)",
    [
      "admin-membership",
      user.uuid,
      "admin-org",
      "org-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  database.run("INSERT INTO twofactor (uuid, user_uuid, atype, enabled, data, last_used) VALUES (?, ?, ?, ?, ?, ?)", [
    "admin-twofactor",
    user.uuid,
    0,
    1,
    "encrypted-secret",
    0,
  ])
  const secondOwner = userCreate("second-admin-user", "second-admin-user@example.com")
  expect(identityUserSave(database, secondOwner).success).toBe(true)
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?)",
    [
      "second-admin-membership",
      secondOwner.uuid,
      "admin-org",
      "org-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  const unregistered: string[] = []
  const app = appCreate(database, {
    identityConfig: { ORG_EVENTS_ENABLED: true },
    push: {
      registerDevice: async () => resultCreate(undefined),
      unregisterDevice: async (pushUuid) => {
        if (pushUuid !== null) unregistered.push(pushUuid)
        return resultCreate(undefined)
      },
      dispatch: async () => undefined,
    },
  })
  const cookie = await adminLogin(app)

  const membership = await request(app, "/admin/users/org_type", "POST", cookie, {
    user_type: "Manager",
    user_uuid: user.uuid,
    org_uuid: "admin-org",
  })
  expect(membership.status).toBe(200)
  expect(database.query("SELECT atype FROM users_organizations WHERE uuid = ?").get("admin-membership")).toEqual({
    atype: 3,
  })
  expect(database.query("SELECT event_type, org_uuid, org_user_uuid, act_user_uuid FROM event").all()).toEqual([
    {
      act_user_uuid: "vaultwarden-admin-00000-000000000000",
      event_type: eventType.organizationUserUpdated,
      org_uuid: "admin-org",
      org_user_uuid: "admin-membership",
    },
  ])
  const profile = await request(app, `/admin/users/${user.uuid}`, "GET", cookie)
  expect(profile.status).toBe(200)
  expect((await profile.json()) as { twoFactorEnabled: boolean; organizations: unknown[] }).toMatchObject({
    twoFactorEnabled: true,
    organizations: [{ organizationUserId: "admin-membership", type: 4 }],
  })
  const removeTwoFactor = await request(app, `/admin/users/${user.uuid}/remove-2fa`, "POST", cookie)
  expect(removeTwoFactor.status).toBe(200)
  expect(database.query("SELECT COUNT(*) AS count FROM twofactor WHERE user_uuid = ?").get(user.uuid)).toEqual({
    count: 0,
  })

  const deauth = await request(app, `/admin/users/${user.uuid}/deauth`, "POST", cookie)
  expect(deauth.status).toBe(200)
  expect(unregistered).toEqual(["admin-push"])
  expect(database.query("SELECT COUNT(*) AS count FROM devices WHERE user_uuid = ?").get(user.uuid)).toEqual({
    count: 0,
  })
  const securityStamp = database
    .query<{ security_stamp: string }, [string]>("SELECT security_stamp FROM users WHERE uuid = ?")
    .get(user.uuid)
  expect(securityStamp?.security_stamp).toMatch(/^admin-generated-/)
  expect(securityStamp?.security_stamp).not.toBe(user.securityStamp)

  const disable = await request(app, `/admin/users/${user.uuid}/disable`, "POST", cookie)
  expect(disable.status).toBe(200)
  expect(database.query("SELECT enabled FROM users WHERE uuid = ?").get(user.uuid)).toEqual({ enabled: 0 })
  expect((await request(app, `/admin/users/${user.uuid}/enable`, "POST", cookie)).status).toBe(200)
  expect(database.query("SELECT enabled FROM users WHERE uuid = ?").get(user.uuid)).toEqual({ enabled: 1 })

  expect((await request(app, "/admin/organizations/overview", "GET", cookie)).status).toBe(200)
  const deletedOrganization = await request(app, "/admin/organizations/admin-org/delete", "POST", cookie)
  expect(deletedOrganization.status).toBe(200)
  expect(database.query("SELECT COUNT(*) AS count FROM organizations WHERE uuid = ?").get("admin-org")).toEqual({
    count: 0,
  })
})
