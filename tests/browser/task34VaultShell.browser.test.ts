import { expect, test } from "@playwright/test"
import {
  browserAuthenticatedSessionSetup,
  browserAuthenticatedSessionUnlock,
} from "./helpers/browserAuthenticatedSessionSetup.js"
import { vaultBrowserMockDataCreate } from "./helpers/vaultBrowserMockDataCreate.js"

test.describe("task 34 vault shell and navigation UI", () => {
  test("serves direct SPA demo entry points", async ({ page }) => {
    const demoRoutes = [
      "/demo",
      "/demo/all",
      "/demo/login",
      "/demo/secure-note",
      "/demo/credit-card",
      "/demo/identity",
      "/demo/empty",
      "/demo/trash",
      "/demo/locked",
    ]

    for (const path of demoRoutes) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should serve the SPA`).not.toBe(404)
      await expect(page.locator("body")).toBeVisible()
    }
  })

  test("filters by vault, category, folders, and favorites", async ({ page }) => {
    await page.goto("/demo/all")

    await expect(page.getByRole("heading", { level: 2, name: /GitHub Enterprise/i })).toBeVisible()
    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    const itemButton = (name: RegExp) => itemList.getByRole("button", { name })

    // Select My Vault
    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    await nav.getByRole("button", { name: /^My Vault\s+\d+$/ }).click()
    await expect(itemButton(/ProtonMail Secure Mailbox/i)).toBeVisible()
    await expect(itemButton(/AWS Console - Root Admin/i)).not.toBeVisible()

    // Select organization vault
    await nav.getByRole("button", { name: /^Acme Corporation\s+\d+$/ }).click()
    await expect(itemButton(/GitHub Enterprise/i)).toBeVisible()

    // Select Favorites
    await nav.getByRole("button", { name: /^Favorites\s+\d+$/ }).click()
    await expect(itemButton(/ProtonMail Secure Mailbox/i)).toBeVisible()

    // Select All Items again
    await nav.getByRole("button", { name: /^All Items\s+\d+$/ }).click()
    await expect(itemButton(/GitHub Enterprise/i)).toBeVisible()
    await expect(itemButton(/AWS Console - Root Admin/i)).toBeVisible()
  })

  test("supports search input, keyboard workflow, and item selection", async ({ page }) => {
    await page.goto("/demo/all")

    // Press '/' to focus search input
    await page.keyboard.press("/")
    const searchInput = page.getByRole("searchbox")
    await expect(searchInput).toBeFocused()

    // Type query
    await searchInput.fill("AWS")
    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    await expect(itemList.getByRole("button", { name: /AWS Console - Root Admin/i })).toBeVisible()
    await expect(itemList.getByRole("button", { name: /GitHub Enterprise/i })).not.toBeVisible()

    // Press Escape to clear search
    await page.keyboard.press("Escape")
    await expect(searchInput).toHaveValue("")
    await expect(itemList.getByRole("button", { name: /GitHub Enterprise/i })).toBeVisible()

    // Arrow navigation
    await page.keyboard.press("ArrowDown")
    await expect(page.getByRole("heading", { level: 2, name: /AWS Console - Root Admin/i })).toBeVisible()
  })

  test("renders empty state with accessible structure on /demo/empty", async ({ page }) => {
    await page.goto("/demo/empty")

    await expect(page.getByText("No matching items")).toBeVisible()
    await expect(page.getByText("No Cipher Selected")).toBeVisible()
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible()
  })

  test("handles locked vault unlocking and relocking on /demo/locked", async ({ page }) => {
    await page.goto("/demo/locked")

    await expect(page.getByRole("heading", { level: 2, name: "Vault is Locked" })).toBeVisible()
    await expect(page.getByLabel("Master Password")).toBeVisible()

    // Unlock
    await page.getByLabel("Master Password").fill("demo-master-password")
    await page.getByRole("button", { name: "Unlock Vault" }).click()
    await expect(page.getByText("Vault Decrypted & Unlocked")).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "GitHub Enterprise" })).toBeVisible()

    // Re-lock
    await page.getByRole("button", { name: "Re-lock Vault" }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Vault is Locked" })).toBeVisible()
  })

  test("supports responsive mobile tab switching without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/demo/all")

    await expect(page.getByRole("button", { name: /^Items/ })).toBeVisible()
    const mobileTabs = page.getByRole("navigation", { name: "Vault sections" })
    await expect(mobileTabs.getByRole("button", { name: "Vaults", exact: true })).toBeVisible()
    await expect(mobileTabs.getByRole("button", { name: "Items", exact: false })).toBeVisible()
    await expect(mobileTabs.getByRole("button", { name: "Details", exact: true })).toBeVisible()

    // Switch to Vaults tab
    await mobileTabs.getByRole("button", { name: "Vaults", exact: true }).click()
    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    await expect(nav.getByText("Alex Rivera", { exact: true })).toBeVisible()

    // Switch to Items tab
    await page.getByRole("button", { name: /^Items/ }).click()
    await expect(
      page.getByRole("list", { name: "Vault Credentials" }).getByRole("button", { name: /^GitHub Enterprise/ }),
    ).toBeVisible()

    // Switch to Details tab
    await mobileTabs.getByRole("button", { name: "Details", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "GitHub Enterprise" })).toBeVisible()

    // Check no horizontal scroll overflow
    const viewportState = await page.locator("body").evaluate((body) => ({
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
    }))
    expect(viewportState.scrollWidth).toBeLessThanOrEqual(viewportState.clientWidth)
  })

  test("syncs live vault data from mocked API on root vault shell", async ({ page }) => {
    const mockSyncData = vaultBrowserMockDataCreate()

    await browserAuthenticatedSessionSetup(page)

    await page.route("**/api/sync", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSyncData),
      })
    })

    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await expect(page.getByRole("heading", { level: 1, name: "OneWarden" })).toBeVisible()

    // Trigger sync
    const syncButton = page.getByRole("banner").getByRole("button", { name: "Sync", exact: true })
    await expect(syncButton).toBeVisible()
    await expect(syncButton).toBeEnabled()
    await syncButton.click()
    await expect(page.getByRole("list", { name: "Vault Credentials" })).toBeVisible()
    await expect(page.getByRole("button", { name: /AWS Production Console/i })).toBeVisible()
    await expect(page.getByRole("contentinfo").getByText("End-to-End Encrypted", { exact: true })).toBeVisible()
  })
})
