import { expect, test } from "@playwright/test"
import { demoBrowserSessionReset } from "./helpers/demoBrowserSessionReset.js"

const demoSettingsRoutes = [
  { path: "/demo/settings", heading: "Profile" },
  { path: "/demo/settings/account", heading: "Profile" },
  { path: "/demo/settings/profile", heading: "Profile" },
  { path: "/demo/settings/security", heading: "Security & KDF" },
  { path: "/demo/settings/two-factor", heading: "Security & KDF" },
  { path: "/demo/settings/2fa", heading: "Security & KDF" },
  { path: "/demo/settings/two-factor-setup", heading: "Security & KDF" },
  { path: "/demo/settings/email", heading: "Email Address" },
  { path: "/demo/settings/devices", heading: "Devices" },
  { path: "/demo/settings/sessions", heading: "Devices" },
  { path: "/demo/settings/emergency", heading: "Emergency Access" },
  { path: "/demo/settings/tools", heading: "Tools" },
  { path: "/demo/settings/import", heading: "Tools" },
  { path: "/demo/settings/export", heading: "Tools" },
  { path: "/demo/settings/appearance", heading: "Appearance" },
  { path: "/demo/settings/theme", heading: "Appearance" },
  { path: "/demo/settings/danger", heading: "Danger Zone" },
  { path: "/demo/settings/delete-account", heading: "Danger Zone" },
] as const

test.describe("task 3 demo settings", () => {
  test.beforeEach(async ({ page }) => {
    await demoBrowserSessionReset(page)
  })

  test("renders direct settings routes and updates section history", async ({ page }) => {
    for (const route of demoSettingsRoutes) {
      const response = await page.goto(route.path)

      expect(response?.status(), `${route.path} should serve the demo settings page`).toBe(200)
      await expect(page.getByRole("heading", { level: 2, name: route.heading, exact: true })).toBeVisible()
      expect(page.url()).not.toMatch(/\/login\/?$/)
    }

    await page.goto("/demo/settings")
    const desktopNavigation = page.locator('nav[aria-label="Settings sections"]').nth(1)

    await desktopNavigation.getByRole("button", { name: /^Security/ }).click()
    await expect(page).toHaveURL(/\/demo\/settings\/security$/)
    await expect(page.getByRole("heading", { level: 2, name: "Security & KDF" })).toBeVisible()

    await desktopNavigation.getByRole("button", { name: /^Email/ }).click()
    await expect(page).toHaveURL(/\/demo\/settings\/email$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/demo\/settings\/security$/)
    await expect(page.getByRole("heading", { level: 2, name: "Security & KDF" })).toBeVisible()
  })

  test("keeps representative settings interactions local", async ({ page }) => {
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url())
    })

    await page.goto("/demo/settings")
    await page.getByLabel("Display Name").fill("")
    await page.getByRole("button", { name: "Save Profile", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Display name is required.")

    await page.getByLabel("Display Name").fill("Task 3 Demo User")
    await page.getByRole("button", { name: "Save Profile", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo profile saved locally.")

    await page
      .locator('nav[aria-label="Settings sections"]')
      .nth(1)
      .getByRole("button", { name: /^Security/ })
      .click()
    await page.getByLabel("Current Master Password").fill("current-password")
    await page.getByLabel("New Master Password", { exact: true }).fill("new-password")
    await page.getByLabel("Confirm New Master Password", { exact: true }).fill("different-password")
    await page.getByRole("button", { name: "Change Master Password", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Use at least 8 characters and make both new passwords match.")

    await page.getByLabel("Confirm New Master Password", { exact: true }).fill("new-password")
    await page.getByRole("button", { name: "Change Master Password", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo master password updated locally.")

    await page
      .locator('nav[aria-label="Settings sections"]')
      .nth(1)
      .getByRole("button", { name: /^Email/ })
      .click()
    await page.getByLabel("New Email Address").fill("task3@example.com")
    await page.getByLabel("Current Master Password").fill("current-password")
    await page.getByRole("button", { name: "Send Verification Code", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo verification code sent. Use 123456.")
    const emailConfirmMasterPassword = page.getByLabel("Confirm Master Password")
    await emailConfirmMasterPassword.fill("demo-master-password")
    await page.getByLabel("Verification Code").fill("000000")
    await page.getByRole("button", { name: "Confirm Email Change", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("For this demo, enter verification code 123456.")
    await page.getByLabel("Verification Code").fill("123456")
    await emailConfirmMasterPassword.fill("")
    await page.getByRole("button", { name: "Confirm Email Change", exact: true }).click()
    expect(
      await emailConfirmMasterPassword.evaluate((input) => (input as HTMLInputElement).validity.valueMissing),
    ).toBe(true)
    await emailConfirmMasterPassword.fill("demo-master-password")
    await page.getByRole("button", { name: "Confirm Email Change", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo email changed locally to task3@example.com.")

    expect(apiRequests).toEqual([])
  })

  test("completes the security key rotation confirmation locally", async ({ page }) => {
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url())
    })

    await page.goto("/demo/settings/security")
    await page.getByRole("button", { name: "Rotate Demo Keys", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Confirm Key Rotation", exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Confirm", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Enter your master password to rotate encryption keys.")

    await page.getByLabel("Master password for key rotation").fill("demo-master-password")
    await page.getByRole("button", { name: "Confirm", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo encryption keys rotated locally.")
    await expect(page.getByRole("heading", { name: "Confirm Key Rotation", exact: true })).toHaveCount(0)
    expect(apiRequests).toEqual([])
  })

  test("completes an emergency access action locally", async ({ page }) => {
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url())
    })

    await page.goto("/demo/settings/emergency")
    await page.getByRole("button", { name: "Initiate Access", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo access request initiated for taylor@example.com.")
    expect(apiRequests).toEqual([])
  })

  test("requires a password and copies a tools export locally", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url())
    })

    await page.goto("/demo/settings/tools")
    const decryptedJson = page.getByRole("button", { name: "Decrypted JSON", exact: true })
    await decryptedJson.click()
    await expect(decryptedJson).toHaveAttribute("aria-pressed", "true")

    const exportPassword = page.locator("#demo-export-password")
    await page.getByRole("button", { name: "Export Vault", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Enter your master password to export a decrypted vault.")

    await exportPassword.fill("demo-master-password")
    await page.getByRole("button", { name: "Export Vault", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo Decrypted JSON export prepared locally.")

    await page.getByRole("button", { name: "Copy to Clipboard", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo vault export copied to the clipboard.")
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("OneWarden demo Decrypted JSON vault export")
    expect(apiRequests).toEqual([])
  })

  test("submits the danger-zone recovery form locally", async ({ page }) => {
    const apiRequests: string[] = []
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url())
    })

    await page.goto("/demo/settings/danger")
    await page.getByRole("button", { name: "Request Deletion by Email", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Request Deletion Email", exact: true })).toBeVisible()

    const recoveryEmail = page.getByLabel("Account Email")
    await expect(recoveryEmail).toHaveAttribute("type", "email")
    await recoveryEmail.fill("recovery@example.com")
    await page.getByRole("button", { name: "Send Deletion Link", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Demo deletion link queued locally. No email was sent.")
    expect(apiRequests).toEqual([])
  })

  test("supports mobile section navigation and appearance theme controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/demo/settings")

    const mobileNavigation = page.locator('nav[aria-label="Settings sections"]').first()
    const desktopNavigation = page.locator('nav[aria-label="Settings sections"]').nth(1)
    await expect(mobileNavigation).toBeVisible()
    await expect(desktopNavigation).toBeHidden()

    await mobileNavigation.getByRole("button", { name: "Appearance", exact: true }).click()
    await expect(page).toHaveURL(/\/demo\/settings\/appearance$/)
    await expect(page.getByRole("heading", { level: 2, name: "Appearance" })).toBeVisible()

    const themeButton = page.getByTitle(/^Current theme: /)
    await expect(themeButton).toBeVisible()
    await themeButton.click()
    await expect(page.locator("html")).toHaveClass(/dark/)
    expect(await page.evaluate(() => window.localStorage.getItem("theme"))).toBe("dark")
  })

  test("restores the stored dark theme on hard settings navigation and reload", async ({ page }) => {
    await page.goto("/demo/settings/appearance")

    await page.getByTitle(/^Current theme: /).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.goto("/demo/settings/profile")
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})
