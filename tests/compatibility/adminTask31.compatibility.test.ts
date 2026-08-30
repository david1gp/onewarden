import { expect, test } from "bun:test"
import { adminBackupAdapterCreate } from "../../src/server/contexts/admin/adminBackupAdapterCreate.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

test("admin route registrations preserve every upstream admin method and path", () => {
  const app = serverAppCreate({ admin: { config: { ADMIN_TOKEN: "compatibility-token" } } })
  const actual = serverRouteRegistrationIntrospect(app)
    .filter((route) => route.path.startsWith("/admin"))
    .map(({ method, path }) => `${method} ${path}`)
    .sort()
  const expected = manifest.routes
    .filter((route) => route.source.file === "src/api/admin.rs")
    .map((route) => `${route.method} ${route.path}`)
    .sort()
  expect([...new Set(actual)]).toEqual([...new Set(expected)])
})

test("admin backup preserves the upstream plain-text success response and status", async () => {
  const app = serverAppCreate({
    admin: {
      backup: { create: () => resultCreate("/tmp/onewarden-backup-bundle") },
      config: { DISABLE_ADMIN_TOKEN: true },
    },
  })
  const response = await app.request("https://vault.example/admin/config/backup_db", { method: "POST" })

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("text/plain; charset=UTF-8")
  expect(await response.text()).toBe("Backup to '/tmp/onewarden-backup-bundle' was successful")
})

test("admin backup preserves the upstream invalid-database status", async () => {
  const app = serverAppCreate({
    admin: {
      backup: adminBackupAdapterCreate({ databasePath: ":memory:" }),
      config: { DISABLE_ADMIN_TOKEN: true },
    },
  })
  const response = await app.request("https://vault.example/admin/config/backup_db", { method: "POST" })

  expect(response.status).toBe(400)
  expect((await response.json()) as { message: string }).toMatchObject({
    message: "Can't back up current DB (Only SQLite supports this feature)",
  })
})
