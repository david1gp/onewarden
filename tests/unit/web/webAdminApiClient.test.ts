import { expect, test } from "bun:test"
import { webAdminApiClientCreate } from "../../../src/web/admin/model/webAdminApiClientCreate.js"

test("webAdminApiClient handles login, logout, users, organizations, config, diagnostics, smtp test, and backup", async () => {
  const requests: Array<{ url: string; method: string; body: string }> = []

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = String(init?.body ?? "")
    requests.push({ url, method, body })

    if (url.endsWith("/admin/") && method === "POST") {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/admin/logout")) {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/admin/users") && method === "GET") {
      return new Response(
        JSON.stringify([
          {
            id: "user-1",
            name: "Admin User",
            email: "admin@example.com",
            emailVerified: true,
            userEnabled: true,
            twoFactorEnabled: true,
            createdAt: "2026-08-29 10:00:00 UTC",
            creationDate: "2026-08-29 10:00:00 UTC",
            lastActive: "2026-08-29 12:00:00 UTC",
            organizations: [],
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/admin/invite") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "user-2",
          name: "Invited User",
          email: "invited@example.com",
          emailVerified: false,
          userEnabled: true,
          twoFactorEnabled: false,
          createdAt: "2026-08-29 12:00:00 UTC",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (
      url.endsWith("/admin/users/user-1/deauth") ||
      url.endsWith("/admin/users/user-1/disable") ||
      url.endsWith("/admin/users/user-1/enable") ||
      url.endsWith("/admin/users/user-1/delete") ||
      url.endsWith("/admin/users/user-1/remove-2fa") ||
      url.endsWith("/admin/users/user-1/invite/resend") ||
      url.endsWith("/admin/organizations/org-1/delete") ||
      (url.endsWith("/admin/config") && method === "POST") ||
      url.endsWith("/admin/config/delete") ||
      url.endsWith("/admin/test/smtp")
    ) {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/admin/organizations/overview")) {
      return new Response(
        JSON.stringify([
          {
            id: "org-1",
            name: "Acme Corp",
            user_count: 5,
            cipher_count: 20,
            collection_count: 2,
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/admin/diagnostics/config")) {
      return new Response(
        JSON.stringify({
          signups_allowed: true,
          invitations_allowed: true,
          emergency_access_allowed: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/admin/config/backup_db")) {
      return new Response("Backup to 'backup.sqlite3' was successful", { status: 200 })
    }

    return new Response("Not found", { status: 404 })
  }

  const client = webAdminApiClientCreate({ fetch: fakeFetch })

  // Login
  const loginRes = await client.login("admin-token-123")
  expect(loginRes.success).toBe(true)

  // Users
  const usersRes = await client.usersList()
  expect(usersRes.success).toBe(true)
  if (usersRes.success) {
    expect(usersRes.data.length).toBe(1)
    expect(usersRes.data[0]?.email).toBe("admin@example.com")
  }

  // Invite
  const inviteRes = await client.userInvite("invited@example.com")
  expect(inviteRes.success).toBe(true)

  // Deauth, Disable, Enable, Remove 2FA, Resend Invite, Delete
  expect((await client.userDeauth("user-1")).success).toBe(true)
  expect((await client.userDisable("user-1")).success).toBe(true)
  expect((await client.userEnable("user-1")).success).toBe(true)
  expect((await client.userRemove2fa("user-1")).success).toBe(true)
  expect((await client.userResendInvite("user-1")).success).toBe(true)
  expect((await client.userDelete("user-1")).success).toBe(true)

  // Organizations
  const orgsRes = await client.organizationsList()
  expect(orgsRes.success).toBe(true)
  if (orgsRes.success) {
    expect(orgsRes.data.length).toBe(1)
    expect(orgsRes.data[0]?.name).toBe("Acme Corp")
  }

  const delOrgRes = await client.organizationDelete("org-1")
  expect(delOrgRes.success).toBe(true)

  // Config & Diagnostics
  const configRes = await client.diagnosticsConfigGet()
  expect(configRes.success).toBe(true)
  if (configRes.success) {
    expect(configRes.data.signups_allowed).toBe(true)
  }

  expect((await client.configUpdate({ signups_allowed: false })).success).toBe(true)
  expect((await client.configDelete()).success).toBe(true)

  // SMTP Test
  expect((await client.smtpTest("test@example.com")).success).toBe(true)

  // Backup
  const backupRes = await client.backupDatabase()
  expect(backupRes.success).toBe(true)
  if (backupRes.success) {
    expect(backupRes.data).toContain("backup.sqlite3")
  }

  // Logout
  expect((await client.logout()).success).toBe(true)
})
