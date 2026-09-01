import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const temporaryFolders: string[] = []

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) rmSync(folder, { force: true, recursive: true })
})

test("web routes serve the vault, static files, aliases, health, and protocol metadata", async () => {
  const folder = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "onewarden-web-test-"))
  temporaryFolders.push(folder)
  const webFolder = join(folder, "web")
  const staticFolder = join(folder, "static")
  mkdirSync(join(webFolder, "assets"), { recursive: true })
  mkdirSync(staticFolder, { recursive: true })
  writeFileSync(join(webFolder, "index.html"), "<!doctype html><title>Test vault</title>")
  writeFileSync(join(webFolder, "assets", "app.js"), "console.log('test')")
  writeFileSync(join(staticFolder, "admin.js"), "window.admin = true")
  writeFileSync(join(staticFolder, "secret.txt"), "must not be served")

  const app = serverAppCreate({
    clock: clockTestCreate("2026-08-28T00:00:00.123Z"),
    web: {
      publicOrigin: "https://vault.example",
      staticFolder,
      webVaultFolder: webFolder,
    },
  })

  const indexResponse = await app.request("http://localhost/")
  expect(indexResponse.status).toBe(200)
  expect(indexResponse.headers.get("cache-control")).toBe("public, max-age=600")
  expect(await indexResponse.text()).toContain("Test vault")

  for (const path of [
    "/login",
    "/unlock",
    "/demo",
    "/demo/settings",
    "/demo/settings/account",
    "/demo/settings/profile",
    "/demo/settings/security",
    "/demo/settings/two-factor",
    "/demo/settings/2fa",
    "/demo/settings/two-factor-setup",
    "/demo/settings/email",
    "/demo/settings/devices",
    "/demo/settings/sessions",
    "/demo/settings/emergency",
    "/demo/settings/tools",
    "/demo/settings/import",
    "/demo/settings/export",
    "/demo/settings/appearance",
    "/demo/settings/theme",
    "/demo/settings/danger",
    "/demo/settings/delete-account",
    "/organizations",
    "/organization",
    "/org",
    "/demo/organizations",
    "/demo/organization",
    "/demo/org",
    "/sso-connector.html",
    "/sso-connector",
    "/vault",
    "/vault/cipher-id",
    "/vault/cipher-id/edit",
    "/settings/security",
    "/sends",
    "/send/access-id",
    "/sends/access/access-id",
    "/emergency-access",
    "/admin-ui/users",
  ]) {
    const spaResponse = await app.request(`http://localhost${path}`)
    expect(spaResponse.status).toBe(200)
    expect(await spaResponse.text()).toContain("Test vault")
  }

  const indexAliasResponse = await app.request("http://localhost/index.html", { redirect: "manual" })
  expect(indexAliasResponse.status).toBe(303)
  expect(indexAliasResponse.headers.get("location")).toBe("/")

  const indexHeadResponse = await app.request("http://localhost/", { method: "HEAD" })
  expect(indexHeadResponse.status).toBe(200)
  expect(await indexHeadResponse.text()).toBe("")

  const assetResponse = await app.request("http://localhost/assets/app.js")
  expect(assetResponse.status).toBe(200)
  expect(assetResponse.headers.get("content-type")).toContain("application/javascript")
  expect(await assetResponse.text()).toBe("console.log('test')")

  const assetPostResponse = await app.request("http://localhost/assets/app.js", { method: "POST" })
  expect(assetPostResponse.status).toBe(404)
  expect(assetPostResponse.headers.get("content-type")).toContain("text/html")

  const staticResponse = await app.request("http://localhost/vw_static/admin.js")
  expect(staticResponse.status).toBe(200)
  expect(staticResponse.headers.get("content-type")).toContain("application/javascript")
  expect(await staticResponse.text()).toBe("window.admin = true")

  const unknownStaticResponse = await app.request("http://localhost/vw_static/secret.txt")
  expect(unknownStaticResponse.status).toBe(404)
  expect(await unknownStaticResponse.json()).toMatchObject({ message: "Not found.", object: "error" })

  const aliveResponse = await app.request("http://localhost/alive")
  expect(aliveResponse.status).toBe(200)
  expect(aliveResponse.headers.get("content-type")).toBe("application/json")
  expect(await aliveResponse.json()).toBe("2026-08-28T00:00:00.123000Z")
  expect((await app.request("http://localhost/alive", { method: "HEAD" })).status).toBe(200)
  expect(await (await app.request("http://localhost/api/alive")).json()).toBe("2026-08-28T00:00:00.123000Z")
  expect(await (await app.request("http://localhost/api/now")).json()).toBe("2026-08-28T00:00:00.123000Z")
  expect(await (await app.request("http://localhost/api/version")).json()).toBe("0.0.0")
  expect(await (await app.request("http://localhost/api/webauthn")).json()).toEqual({
    continuationToken: null,
    data: [],
    object: "list",
  })

  const appIdResponse = await app.request("http://localhost/app-id.json")
  expect(appIdResponse.status).toBe(200)
  expect(appIdResponse.headers.get("content-type")).toBe("application/fido.trusted-apps+json")
  expect(await appIdResponse.json()).toEqual({
    trustedFacets: [
      {
        ids: [
          "https://vault.example",
          "ios:bundle-id:com.8bit.bitwarden",
          "android:apk-key-hash:dUGFzUzf3lmHSLBDBIv+WaFyZMI",
        ],
        version: { major: 1, minor: 0 },
      },
    ],
  })

  expect(await (await app.request("http://localhost/.well-known/apple-app-site-association")).json()).toEqual({
    webcredentials: { apps: ["LTZ2PFU5D6.com.8bit.bitwarden", "LTZ2PFU5D6.com.8bit.bitwarden.beta"] },
  })

  const config = await (await app.request("http://localhost/api/config")).json()
  expect(config).toMatchObject({
    environment: {
      api: "https://vault.example/api",
      identity: "https://vault.example/identity",
      notifications: "https://vault.example/notifications",
      vault: "https://vault.example",
    },
    featureStates: { "pm-19148-innovation-archive": true },
    object: "config",
    version: "2026.6.0",
  })
})

test("web fallback keeps browser paths HTML and API paths JSON", async () => {
  const folder = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "onewarden-web-fallback-test-"))
  temporaryFolders.push(folder)
  const app = serverAppCreate({ web: { webVaultFolder: folder } })

  const browserResponse = await app.request("http://localhost/does-not-exist")
  expect(browserResponse.status).toBe(404)
  expect(browserResponse.headers.get("content-type")).toContain("text/html")
  expect(await browserResponse.text()).toContain("Page not found!")

  const apiResponse = await app.request("http://localhost/api/does-not-exist")
  expect(apiResponse.status).toBe(404)
  expect(apiResponse.headers.get("content-type")).toContain("application/json")
  expect(await apiResponse.json()).toMatchObject({ message: "Not found.", object: "error" })

  const staticResponse = await app.request("http://localhost/vw_static/missing.js")
  expect(staticResponse.status).toBe(404)
  expect(await staticResponse.json()).toMatchObject({ message: "Not found.", object: "error" })
})

test("web health reports a database failure and web disabling removes browser routes", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const app = serverAppCreate({ database: databaseResult.data })
  const closeResult = databaseClose(databaseResult.data)
  expect(closeResult.success).toBe(true)

  const aliveResponse = await app.request("http://localhost/alive")
  expect(aliveResponse.status).toBe(503)
  expect(await aliveResponse.json()).toMatchObject({ message: "Database unavailable.", object: "error" })

  const disabledApp = serverAppCreate({ web: { webVaultEnabled: false } })
  const rootResponse = await disabledApp.request("http://localhost/")
  expect(rootResponse.status).toBe(404)
  expect(await rootResponse.json()).toMatchObject({ message: "Not found.", object: "error" })
})
