import { expect, type Page, test } from "@playwright/test"
import { base64UrlEncode } from "../../src/shared/crypto/base64UrlEncode.js"
import { bitwardenCipherStringEncrypt } from "../../src/shared/crypto/bitwardenCipherStringEncrypt.js"

const masterPassword = "browser-test-master-password"
const encryptedUserKey =
  "2.EQavrUsu9Dmfy9G0APwMiw==|jKtp2d+Ci1ZE4l1Blce5RRMkM61y+zc8ROYmkgGLhm2r8qGwby0+8pjFKcKTl4AYYGaBXAxPzDZJWcq3DMYCQUo/qgbApI5Loii5WulA6Uk=|Y1zA1v8ngKLSY8iRg5S5RPRKT8aGAkhKHSLd1RLJ85o="
const authenticatedSessionCreate = async () => {
  return {
    email: "user@example.com",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    tokenType: "Bearer",
    expiresAt: 4_102_444_800_000,
    userId: "user-id",
    kdf: 0,
    kdfIterations: 1,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey,
  }
}

const sendItem = {
  id: "send-1",
  accessId: "access-1",
  type: 0,
  name: "Existing Send",
  notes: null,
  text: { text: "Existing content" },
  file: null,
  key: "send-key",
  maxAccessCount: null,
  accessCount: 0,
  password: null,
  authType: 2,
  disabled: false,
  hideEmail: false,
  revisionDate: "2026-08-29T12:00:00.000Z",
  expirationDate: null,
  deletionDate: "2026-09-28T12:00:00.000Z",
  object: "send",
}

async function pageUseAuthenticatedSession(page: Page): Promise<void> {
  const session = await authenticatedSessionCreate()
  await page.addInitScript((value) => {
    window.localStorage.setItem("onewarden_web_auth_session", JSON.stringify(value))
  }, session)
  await page.goto("/unlock")
  await pageUnlock(page)
}

async function pageUnlock(page: Page): Promise<void> {
  if ((await page.getByRole("button", { name: "Unlock Vault", exact: true }).count()) === 0) return
  await page.getByLabel("Master Password").fill(masterPassword)
  await page.getByRole("button", { name: "Unlock Vault", exact: true }).click()
  await expect(page.locator("main")).not.toContainText("Vault is Locked")
}

async function pageMockTask37Apis(page: Page): Promise<void> {
  await page.route("**/api/accounts/profile", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-id",
        name: "Test User",
        email: "user@example.com",
        emailVerified: true,
        masterPasswordHint: null,
        premium: false,
        culture: "en-US",
        twoFactorEnabled: false,
        key: null,
        privateKey: null,
        securityStamp: null,
        avatarColor: "#3b82f6",
        forcePasswordReset: false,
        usesKeyConnector: false,
        object: "profile",
      }),
    })
  })

  await page.route("**/api/sends", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ data: [sendItem], object: "list", continuationToken: null }),
      })
      return
    }
    await route.continue()
  })

  await page.route("**/api/sends/access/*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "send-1",
        type: 0,
        name: "Public Send",
        text: { text: "Public content" },
        file: null,
        expirationDate: null,
        creatorIdentifier: "sender@example.com",
        object: "send-access",
      }),
    })
  })

  await page.route("**/api/emergency-access/trusted", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [], object: "list", continuationToken: null }),
    })
  })
  await page.route("**/api/emergency-access/granted", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: [], object: "list", continuationToken: null }),
    })
  })
}

async function pageMockSettingsApis(page: Page): Promise<void> {
  await page.route("**/api/accounts/profile", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-id",
        name: "Test User",
        email: "user@example.com",
        emailVerified: true,
        masterPasswordHint: null,
        premium: false,
        culture: "en-US",
        twoFactorEnabled: false,
        key: null,
        privateKey: null,
        securityStamp: null,
        avatarColor: "#1d4ed8",
        forcePasswordReset: false,
        usesKeyConnector: false,
        object: "profile",
      }),
    })
  })
  await page.route("**/api/devices", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "device-1",
            name: "Browser",
            type: 0,
            identifier: "device-identifier",
            creationDate: "2026-08-29T12:00:00.000Z",
            ip: "127.0.0.1",
            isCurrent: true,
            object: "device",
          },
        ],
        continuationToken: null,
        object: "list",
      }),
    })
  })
  await page.route("**/api/sync", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        profile: {
          organizations: [
            {
              id: "organization-engineering",
              name: "Engineering",
              key: null,
            },
            {
              id: "organization-marketing",
              name: "Marketing",
              key: null,
            },
          ],
        },
        folders: [],
        ciphers: [],
      }),
    })
  })
}

test.describe("task 37 Send, settings, emergency access, and admin UI", () => {
  test("serves deterministic production deep links", async ({ page }) => {
    await pageUseAuthenticatedSession(page)
    await pageMockTask37Apis(page)

    const pages = [
      ["/settings/security", "Security & KDF"],
      ["/sends", "Bitwarden Send"],
      ["/send/access-1", "Bitwarden Send"],
      ["/emergency-access", "Emergency Access"],
    ] as const

    for (const [path, heading] of pages) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should serve the SPA`).not.toBe(404)
      await pageUnlock(page)
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible()
    }
  })

  test("sends the required Send create fields and exposes one accessible textarea label", async ({ page }) => {
    await pageUseAuthenticatedSession(page)
    const publicSendKey = Uint8Array.from({ length: 64 }, (_, index) => index)
    const publicContentResult = await bitwardenCipherStringEncrypt("Public content", publicSendKey)
    if (!publicContentResult.success) throw new Error(publicContentResult.errorMessage)
    let createPayload: Record<string, unknown> | undefined
    await page.route("**/api/sends", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ data: [], object: "list", continuationToken: null }),
        })
        return
      }
      createPayload = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(sendItem) })
    })
    await page.route("**/api/sends/access/*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "send-1",
          type: 0,
          name: "Public Send",
          text: { text: publicContentResult.data },
          file: null,
          expirationDate: null,
          creatorIdentifier: null,
          object: "send-access",
        }),
      })
    })

    await page.getByRole("button", { name: "Send", exact: true }).click()
    await expect(page).toHaveURL(/\/sends$/)
    await page.getByRole("button", { name: "New Send" }).click()
    const dialog = page.getByRole("dialog", { name: "Create Send" })
    await dialog.getByLabel("Name").fill("Deterministic Send")
    await dialog.getByLabel("Text to Send").fill("deterministic content")
    await expect(dialog.getByLabel("Hide my email address from recipients")).toHaveCount(1)
    await dialog.getByRole("button", { name: "Create Send", exact: true }).click()

    await expect(page.getByRole("status")).toContainText("Text send created successfully")
    expect(createPayload).toMatchObject({ key: expect.any(String), disabled: false, deletionDate: expect.any(String) })
    expect(Date.parse(String(createPayload?.deletionDate))).not.toBeNaN()

    await page.goto(`/send/access-1#${base64UrlEncode(publicSendKey)}`)
    await expect(page.getByLabel("Content")).toHaveCount(1)
  })

  test("keeps the admin SPA namespace separate from backend /admin and owns document metadata", async ({ page }) => {
    let isAdminAuthenticated = false
    await page.route("**/admin/", async (route) => {
      isAdminAuthenticated = true
      await route.fulfill({ status: 200 })
    })
    await page.route("**/admin/users", async (route) => {
      if (!isAdminAuthenticated) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Unauthorized" }),
        })
        return
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "admin-user",
            name: "Admin User",
            email: "admin@example.com",
            emailVerified: true,
            userEnabled: true,
            twoFactorEnabled: false,
            createdAt: "2026-08-29 12:00:00 UTC",
            organizations: [],
          },
        ]),
      })
    })

    const response = await page.goto("/admin-ui/users")
    expect(response?.status(), "the admin frontend namespace should serve the SPA").not.toBe(404)
    await expect(page.getByRole("heading", { name: "OneWarden Admin" })).toBeVisible()
    await expect(page).toHaveTitle("OneWarden Admin")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    await page.getByLabel("Admin Token").fill("deterministic-admin-token")
    await page.getByRole("button", { name: "Log In to Admin Panel" }).click()
    await expect(page.getByRole("heading", { name: "OneWarden Admin Panel" })).toBeVisible()
    await expect(page.getByText("admin@example.com")).toBeVisible()
  })

  test("navigates every settings section and retains keyboard access at mobile width", async ({ page }) => {
    await pageUseAuthenticatedSession(page)
    await pageMockSettingsApis(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/settings/account")
    await pageUnlock(page)
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible()

    const sections = [
      ["Security & KDF", "Change Master Password"],
      ["Email Address", "Change Account Email"],
      ["Active Sessions", "Authorized Devices & Sessions"],
      ["Emergency Access", "Emergency Access"],
      ["Import & Export", "Import & Export"],
      ["Danger Zone", "Danger Zone"],
    ] as const
    for (const [navName, heading] of sections) {
      await page.getByRole("button", { name: navName, exact: true }).click()
      await expect(
        heading === "Emergency Access"
          ? page.getByRole("heading", { name: "Emergency Access", exact: true }).last()
          : page.getByRole("heading", { name: heading, exact: true }).first(),
      ).toBeVisible()
    }

    await page.getByRole("button", { name: "Import & Export", exact: true }).click()
    await expect(page.getByText("Importing is additive")).toBeVisible()
    await page.getByRole("button", { name: "Export Vault", exact: true }).click()
    await page.getByRole("button", { name: "Password-protected JSON (.json)", exact: true }).click()
    await expect(page.getByLabel("File Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Confirm File Password", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Unencrypted JSON (.json)", exact: true }).click()
    await expect(
      page.getByText("Warning: this export is not encrypted and contains your passwords and secrets in plain text."),
    ).toBeVisible()
    await page.keyboard.press("Tab")
    await expect(page.locator(":focus")).toBeVisible()
    await page.screenshot({ path: "/tmp/opencode/task37-settings-mobile.png", fullPage: true })
  })

  test("exposes compatible export scopes, warnings, and ZIP download behavior", async ({ page }) => {
    await pageUseAuthenticatedSession(page)
    await pageMockSettingsApis(page)
    await page.goto("/settings/account")
    await pageUnlock(page)
    await page.getByRole("button", { name: "Import & Export", exact: true }).click()
    const importPersonalScope = page.getByRole("button", { name: "My Vault", exact: true })
    const importOrganizationScope = page.getByRole("button", { name: "An Organization", exact: true })
    await expect(importPersonalScope).toHaveAttribute("aria-pressed", "true")
    await importOrganizationScope.click()
    const importOrganizationSelect = page.getByRole("combobox", { name: "Organization" })
    await expect(importOrganizationSelect).toBeVisible()
    await expect(importOrganizationSelect).toHaveValue("organization-engineering")
    await expect(page.getByLabel("File Password", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Master Password", { exact: true })).toHaveCount(0)
    await expect(page.getByText("no file or master password is needed here")).toBeVisible()
    await importPersonalScope.click()
    await expect(page.getByLabel("File Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Master Password", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Export Vault", exact: true }).click()

    const personalScope = page.getByRole("button", { name: "My Vault", exact: true })
    const organizationScope = page.getByRole("button", { name: "An Organization", exact: true })
    await expect(personalScope).toHaveAttribute("aria-pressed", "true")
    await expect(organizationScope).toHaveAttribute("aria-pressed", "false")

    await page.getByRole("button", { name: "Password-protected JSON (.json)", exact: true }).click()
    await expect(page.getByLabel("File Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Confirm File Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Master Password", { exact: true })).toHaveCount(0)

    await page.getByRole("button", { name: "Account-restricted JSON (.json)", exact: true }).click()
    await expect(
      page.getByText(
        "Warning: this export can only be decrypted by this account with its current encryption key. It is not portable and becomes unreadable after rotating your encryption keys.",
      ),
    ).toBeVisible()
    await expect(page.getByLabel("File Password", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Confirm File Password", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Master Password", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "JSON with attachments (.zip)", exact: true }).click()
    await expect(
      page.getByText(/The ZIP also contains every attachment as a decrypted file next to the JSON export\./),
    ).toBeVisible()
    await expect(page.getByText("The ZIP archive is binary and can only be downloaded, not copied.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Copy to Clipboard", exact: true })).toHaveCount(0)
    await expect(page.getByLabel("File Password", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Confirm File Password", { exact: true })).toHaveCount(0)

    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Export Vault", exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.zip$/)
    await expect(page.getByRole("status")).toContainText("Export complete")

    await organizationScope.click()
    const organizationSelect = page.getByRole("combobox", { name: "Organization" })
    await expect(organizationSelect).toBeVisible()
    await expect(organizationSelect).toHaveValue("organization-engineering")
    await expect(organizationSelect).toContainText("Engineering")
    await expect(organizationSelect).toContainText("Marketing")
    await organizationSelect.selectOption("organization-marketing")
    await expect(organizationSelect).toHaveValue("organization-marketing")
    await expect(personalScope).toHaveAttribute("aria-pressed", "false")
    await expect(organizationScope).toHaveAttribute("aria-pressed", "true")

    await expect(page.getByRole("button", { name: "Unencrypted JSON (.json)", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Unencrypted CSV (.csv)", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Password-protected JSON (.json)", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Account-restricted JSON (.json)", exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "JSON with attachments (.zip)", exact: true })).toHaveCount(0)
    await expect(page.getByLabel("File Password", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Confirm File Password", { exact: true })).toHaveCount(0)
    await expect(page.getByLabel("Master Password", { exact: true })).toHaveCount(0)

    await page.getByRole("button", { name: "Unencrypted JSON (.json)", exact: true }).click()
    await expect(page.getByText("Decrypted organization JSON containing organization items")).toBeVisible()
    await page.getByRole("button", { name: "Unencrypted CSV (.csv)", exact: true }).click()
    await expect(
      page.getByText("Decrypted organization CSV containing logins and secure notes with their collection names only."),
    ).toBeVisible()
  })

  test("completes the emergency invite lifecycle entry point with labelled dialog controls", async ({ page }) => {
    await pageUseAuthenticatedSession(page)
    await pageMockTask37Apis(page)
    await page.route("**/api/emergency-access/invite", async (route) => {
      await route.fulfill({ status: 200, body: "" })
    })
    await page.goto("/emergency-access")
    await pageUnlock(page)
    await page.getByRole("button", { name: "Invite Contact" }).click()
    const dialog = page.getByRole("dialog", { name: "Invite Emergency Contact" })
    await dialog.getByLabel("Contact Email Address").fill("contact@example.com")
    await dialog.getByRole("button", { name: "Takeover (Full Account)" }).click()
    await dialog.getByRole("combobox", { name: "Wait Time Before Access Granted" }).selectOption("7")
    await dialog.getByRole("button", { name: "Send Invite" }).click()
    await expect(page.getByRole("status")).toContainText("Emergency access invitation sent to contact@example.com.")
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("keeps Send CRUD controls keyboard reachable and exposes accessible edit controls", async ({ page }) => {
    await pageUseAuthenticatedSession(page)
    await pageMockTask37Apis(page)
    await page.goto("/sends")
    await pageUnlock(page)
    await expect(page.getByRole("button", { name: "New Send" })).toBeVisible()
    await page.getByRole("button", { name: "New Send" }).focus()
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("dialog", { name: "Create Send" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Text to Send")).toHaveCount(1)
    await expect(dialog.getByRole("button", { name: "Close Create Send dialog" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
  })
})
