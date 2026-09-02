import { expect, test } from "@playwright/test"

test.describe("task 33 authentication UI", () => {
  test("serves direct SPA entry points", async ({ page }) => {
    for (const path of ["/login", "/unlock", "/demo"]) {
      const response = await page.goto(path)

      expect(response?.status(), `${path} should serve the SPA`).not.toBe(404)
      await expect(page.locator("main")).toBeVisible()
    }
  })

  test("keeps the login checkbox as one keyboard stop and distinguishes verification links", async ({ page }) => {
    await page.goto("/login")

    await expect(page.getByRole("checkbox")).toHaveCount(1)
    await expect(page.getByRole("checkbox", { name: "Remember email" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Verify Email Address" })).toHaveAttribute("href", "/verify-email")
  })

  test("uses a resend response that supplies a compatible user id and token", async ({ page }) => {
    await page.route("**/identity/accounts/register/send-verification-email", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ userId: "11111111-1111-4111-8111-111111111111", token: "account-token" }),
        status: 200,
      })
    })
    await page.goto("/verify-email")
    await page.getByLabel("Account Email").fill("user@example.com")
    await page.getByRole("button", { name: "Send Verification Email" }).click()

    await expect(page.getByLabel("User ID *")).toHaveValue("11111111-1111-4111-8111-111111111111")
    await expect(page.getByLabel("Verification Token *")).toHaveValue("account-token")
  })

  test("walks the deterministic two-factor login challenge providers", async ({ page }) => {
    await page.route("**/identity/accounts/prelogin", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          kdf: 0,
          kdfIterations: 1,
          kdfMemory: null,
          kdfParallelism: null,
          kdfSettings: { iterations: 1, kdfType: 0, memory: null, parallelism: null },
          salt: null,
        }),
      })
    })
    await page.route("**/identity/connect/token", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "invalid_grant",
          error_description: "Two factor required.",
          TwoFactorProviders: [0, 1, 2, 3, 7, 8],
          TwoFactorProviders2: { "1": { Email: "us***@example.com" } },
        }),
      })
    })
    await page.route("**/api/two-factor/send-email-login", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })

    await page.goto("/login")
    await page.getByLabel("Email Address").fill("user@example.com")
    await page.getByRole("textbox", { name: "Master Password" }).fill("Password123!")
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByRole("heading", { name: "Two-Step Verification" })).toBeVisible()
    const method = page.getByRole("combobox", { name: "Verification Method" })
    for (const [value, label] of [
      ["0", "6-Digit Security Code"],
      ["1", "Email Verification Code"],
      ["2", "Duo Passcode / Push Token"],
      ["3", "YubiKey One-Time Password"],
      ["7", "WebAuthn Assertion JSON (Auto-filled by Security Key)"],
      ["8", "Account Recovery Code"],
    ] as const) {
      await method.selectOption(value)
      const token = page.getByLabel(label)
      await expect(token).toBeVisible()
      await token.fill("deterministic-token")
      await page.getByRole("button", { name: "Verify & Unlock Vault" }).click()
      await expect(page.getByRole("alert")).toContainText("Two factor required")
    }
    await method.selectOption("1")
    await page.getByRole("button", { name: "Send Verification Email" }).click()
    await expect(page.getByRole("status")).toContainText("Verification code sent")
    await page.getByLabel("Email Verification Code").fill("123456")
    await page.locator('label[for="remember-device"]').click()
    await expect(page.getByRole("checkbox", { name: "Remember this device for 30 days" })).toBeChecked()
  })

  test("exercises setup, disable validation, remembered-device clearing, and deep links", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "onewarden_web_auth_session",
        JSON.stringify({
          email: "user@example.com",
          accessToken: "access-token",
          refreshToken: "refresh-token",
          tokenType: "Bearer",
          expiresAt: Date.now() + 3_600_000,
          userId: "user-id",
          kdf: 0,
          kdfIterations: 1,
          kdfMemory: null,
          kdfParallelism: null,
          encryptedUserKey: "wrapped-key",
        }),
      )
    })
    await page.route("**/api/two-factor", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ object: "list", continuationToken: null, data: [] }),
      })
    })
    let authenticatorEnabled = false
    await page.route("**/api/two-factor/get-authenticator", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ object: "twoFactorAuthenticator", enabled: authenticatorEnabled, key: "TESTKEY" }),
      })
    })
    await page.route(/\/api\/two-factor\/authenticator(?:\?.*)?$/, async (route) => {
      if (route.request().method() === "DELETE") {
        authenticatorEnabled = false
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ object: "twoFactorProvider", enabled: false, type: 0 }),
        })
        return
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ object: "twoFactorAuthenticator", enabled: authenticatorEnabled, key: "TESTKEY" }),
      })
    })
    await page.route("**/api/two-factor/get-email", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ object: "twoFactorEmail", enabled: false, email: "user@example.com" }),
      })
    })
    await page.route("**/api/two-factor/get-duo", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          object: "twoFactorDuo",
          enabled: false,
          host: null,
          clientId: null,
          clientSecret: null,
        }),
      })
    })
    await page.route("**/api/two-factor/get-yubikey", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ object: "twoFactorYubikey", enabled: false, Key1: null, Key2: null, nfc: false }),
      })
    })
    await page.route("**/api/two-factor/get-webauthn", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ object: "twoFactorWebAuthn", enabled: false, keys: [] }),
      })
    })

    for (const path of ["/settings/two-factor", "/2fa", "/two-factor-setup"]) {
      const response = await page.goto(path)
      expect(response?.status()).not.toBe(404)
      await expect(page.getByRole("heading", { name: "Two-Step Login" })).toBeVisible()
    }

    await page.getByRole("button", { name: "Set Up" }).first().click()
    await expect(page.getByLabel("Enter 6-Digit Code to Verify")).toBeVisible()
    await page.getByRole("button", { name: "Enable Authenticator" }).click()
    await expect(page.getByRole("alert")).toContainText("6-digit verification code")
    await page.getByRole("button", { name: "Close" }).click()
    authenticatorEnabled = true
    await page.getByRole("button", { name: "Set Up" }).first().click()
    await expect(page.getByText("Authenticator app two-factor authentication is active on this account.")).toBeVisible()
    await page.getByRole("button", { name: "Close" }).click()
    await page.getByRole("button", { name: "Manage" }).first().click()
    await page.getByRole("textbox", { name: /Master Password/ }).fill("")
    await page.getByRole("button", { name: "Disable Authenticator App" }).click()
    await expect(page.getByRole("alert")).toContainText("Master password is required")
    await page.getByRole("textbox", { name: /Master Password/ }).fill("Password123!")
    await page.getByRole("button", { name: "Disable Authenticator App" }).click()
    await expect(page.getByRole("button", { name: "Enable Authenticator" })).toBeVisible()
    await page.getByRole("button", { name: "Clear Remembered Devices" }).click()
    await expect(page.getByRole("status")).toContainText("Remembered device token cleared")
  })

  test("keeps authentication layouts usable at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Log In to OneWarden" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Log In" })).toBeInViewport()
    const viewportState = await page.locator("body").evaluate((body) => ({
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
    }))
    expect(viewportState.scrollWidth).toBeLessThanOrEqual(viewportState.clientWidth)
  })
})
