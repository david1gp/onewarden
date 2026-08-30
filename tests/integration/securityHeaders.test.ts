import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { iconConfigCreate } from "../../src/server/contexts/icons/iconConfigCreate.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

const temporaryFolders: string[] = []

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) rmSync(folder, { force: true, recursive: true })
})

const expectedGlobalHeaders = {
  "content-security-policy": null,
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
}

function expectGlobalHeaders(response: Response, contentSecurityPolicy: string | null = null): void {
  for (const [name, value] of Object.entries({
    ...expectedGlobalHeaders,
    "content-security-policy": contentSecurityPolicy,
  })) {
    expect(response.headers.get(name)).toBe(value)
  }
}

test("serverAppCreate applies global headers to health, API errors, thrown errors, and notifications", async () => {
  const app = serverAppCreate({ notifications: { enabled: true } })
  app.get("/broken", () => {
    throw new Error("not exposed")
  })

  const [liveResponse, readyResponse, healthResponse] = await Promise.all([
    app.request("http://localhost/health/live"),
    app.request("http://localhost/health/ready"),
    app.request("http://localhost/health"),
  ])
  expect(liveResponse.status).toBe(200)
  expect(await liveResponse.json()).toEqual({ status: "ok" })
  expect(readyResponse.status).toBe(503)
  expect(await readyResponse.json()).toEqual({ status: "unavailable" })
  expect(healthResponse.status).toBe(503)
  expect(await healthResponse.json()).toEqual({ status: "unavailable" })
  expectGlobalHeaders(liveResponse)
  expectGlobalHeaders(readyResponse)
  expectGlobalHeaders(healthResponse)

  const notFoundResponse = await app.request("http://localhost/api/missing")
  expect(notFoundResponse.status).toBe(404)
  expect(await notFoundResponse.json()).toMatchObject({ message: "Not found." })
  expectGlobalHeaders(notFoundResponse)

  const brokenResponse = await app.request("http://localhost/broken")
  expect(brokenResponse.status).toBe(500)
  expect(await brokenResponse.json()).toMatchObject({ message: "Internal server error." })
  expectGlobalHeaders(brokenResponse)

  const notificationResponse = await app.request("http://localhost/notifications/hub")
  expect(notificationResponse.status).toBe(426)
  expect(await notificationResponse.text()).toBe("WebSocket upgrade required.")
  expect(notificationResponse.headers.get("connection")).toBe("Upgrade")
  expect(notificationResponse.headers.get("upgrade")).toBe("websocket")
  expectGlobalHeaders(notificationResponse)
})

test("serverAppCreate limits CSP to SPA documents and preserves excluded web response behavior", async () => {
  const folder = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "onewarden-security-headers-test-"))
  temporaryFolders.push(folder)
  const webFolder = join(folder, "web")
  const staticFolder = join(folder, "static")
  mkdirSync(join(webFolder, "assets"), { recursive: true })
  mkdirSync(staticFolder, { recursive: true })
  writeFileSync(join(webFolder, "index.html"), "<!doctype html><title>Test vault</title>")
  writeFileSync(join(webFolder, "assets", "app.js"), "console.log('test')")
  writeFileSync(join(staticFolder, "admin.js"), "window.admin = true")

  const app = serverAppCreate({
    icons: { config: iconConfigCreate({ ICON_SERVICE: "https://icons.example/{}" }) },
    notifications: { enabled: true },
    web: { staticFolder, webVaultFolder: webFolder },
  })
  const contentSecurityPolicy =
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:"

  const rootResponse = await app.request("http://localhost/")
  expect(rootResponse.status).toBe(200)
  expect(await rootResponse.text()).toContain("Test vault")
  expectGlobalHeaders(rootResponse, contentSecurityPolicy)

  const spaResponse = await app.request("http://localhost/login")
  expect(spaResponse.status).toBe(200)
  expect(await spaResponse.text()).toContain("Test vault")
  expectGlobalHeaders(spaResponse, contentSecurityPolicy)

  const sendResponse = await app.request("http://localhost/sends")
  expect(sendResponse.status).toBe(200)
  expect(await sendResponse.text()).toContain("Test vault")
  expectGlobalHeaders(sendResponse)

  const assetResponse = await app.request("http://localhost/assets/app.js")
  expect(assetResponse.status).toBe(200)
  expect(await assetResponse.text()).toBe("console.log('test')")
  expectGlobalHeaders(assetResponse)

  const staticResponse = await app.request("http://localhost/vw_static/admin.js")
  expect(staticResponse.status).toBe(200)
  expect(await staticResponse.text()).toBe("window.admin = true")
  expectGlobalHeaders(staticResponse)

  const iconResponse = await app.request("http://localhost/icons/example.com/icon.png", { redirect: "manual" })
  expect(iconResponse.status).toBe(302)
  expect(iconResponse.headers.get("location")).toBe("https://icons.example/example.com")
  expectGlobalHeaders(iconResponse)

  const attachmentResponse = await app.request("http://localhost/attachments/cipher-id/file-id?token=invalid")
  expect(attachmentResponse.status).toBe(404)
  expectGlobalHeaders(attachmentResponse)

  const sendsResponse = await app.request("http://localhost/api/sends")
  expect(sendsResponse.status).toBe(401)
  expectGlobalHeaders(sendsResponse)

  const downloadResponse = await app.request("http://localhost/api/sends/send-id/file-id?t=invalid")
  expect(downloadResponse.status).toBe(404)
  expectGlobalHeaders(downloadResponse)

  const redirectResponse = await app.request("http://localhost/index.html", { redirect: "manual" })
  expect(redirectResponse.status).toBe(303)
  expect(redirectResponse.headers.get("location")).toBe("/")
  expectGlobalHeaders(redirectResponse)

  const browserNotFoundResponse = await app.request("http://localhost/missing")
  expect(browserNotFoundResponse.status).toBe(404)
  expect(await browserNotFoundResponse.text()).toContain("Page not found!")
  expectGlobalHeaders(browserNotFoundResponse)
})
