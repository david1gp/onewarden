import { expect, test } from "@playwright/test"
import { demoBrowserSessionReset } from "./helpers/demoBrowserSessionReset.js"

const canonicalDemoRoutes = [
  { path: "/demo", heading: "OneWarden UI Demo Directory" },
  { path: "/demo/admin", heading: "OneWarden Administration" },
  { path: "/demo/all-items", heading: "All Vault Items" },
  { path: "/demo/login", heading: "Selected Login Credential" },
  { path: "/demo/secure-note", heading: "Selected Secure Note" },
  { path: "/demo/credit-card", heading: "Selected Credit Card" },
  { path: "/demo/identity", heading: "Selected Identity Profile" },
  { path: "/demo/ssh-key", heading: "Selected SSH Key" },
  { path: "/demo/empty-state", heading: "Empty Vault State" },
  { path: "/demo/trash", heading: "Trash & Deleted Items" },
  { path: "/demo/locked", heading: "Locked Vault State" },
] as const

test.describe("task 7 demo alignment", () => {
  test.beforeEach(async ({ page }) => {
    await demoBrowserSessionReset(page)
  })

  test("renders every canonical demo route directly", async ({ page }) => {
    for (const route of canonicalDemoRoutes) {
      const routePage = await page.context().newPage()
      try {
        const response = await routePage.goto(route.path)

        expect(response?.status(), `${route.path} should serve the demo page`).toBe(200)
        await expect(routePage.getByRole("heading", { level: 1, name: route.heading })).toBeVisible()
      } finally {
        await routePage.close()
      }
    }
  })

  test("composes ownership, category, folder, favorite, search, and clear filters", async ({ page }) => {
    await page.goto("/demo/all-items")

    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    const item = (name: RegExp) => itemList.getByRole("button", { name })
    const search = page.getByRole("searchbox")

    await expect(nav.getByRole("button", { name: /^My Vault\s+\d+$/ })).toBeVisible()
    await expect(nav.getByRole("button", { name: /^Acme Corporation\s+\d+$/ })).toBeVisible()
    await expect(nav.getByRole("button", { name: /^Personal\s+\d+$/ })).toHaveCount(0)
    await expect(nav.getByRole("button", { name: /^Work\s+\d+$/ })).toHaveCount(0)
    await expect(nav.getByRole("button", { name: /^Shared\s+\d+$/ })).toHaveCount(0)

    const categoryExamples = [
      { filter: /^Logins\s+\d+$/, item: /^GitHub Enterprise/ },
      { filter: /^Secure Notes\s+\d+$/, item: /^Office Wi-Fi & Guest Access/ },
      { filter: /^Credit Cards\s+\d+$/, item: /^Acme Corporate Platinum/ },
      { filter: /^Identities\s+\d+$/, item: /^Alex Rivera - Engineering Profile/ },
      { filter: /^SSH Keys\s+\d+$/, item: /^Production Deploy Key \(Ed25519\)/ },
    ] as const

    for (const category of categoryExamples) {
      await nav.getByRole("button", { name: category.filter }).click()
      await expect(item(category.item)).toBeVisible()
      await nav.getByRole("button", { name: /^All Items\s+\d+$/ }).click()
    }

    await nav.getByRole("button", { name: /^My Vault\s+\d+$/ }).click()
    await expect(page.getByRole("region", { name: "Vault Items" }).getByText("My Vault", { exact: true })).toBeVisible()
    await expect(item(/^ProtonMail Secure Mailbox/)).toBeVisible()
    await expect(item(/^GitHub Enterprise/)).not.toBeVisible()

    await nav.getByRole("button", { name: /^Acme Corporation\s+\d+$/ }).click()
    await expect(
      page.getByRole("region", { name: "Vault Items" }).getByText("Acme Corporation", { exact: true }),
    ).toBeVisible()
    await expect(item(/^GitHub Enterprise/)).toBeVisible()
    await expect(item(/^ProtonMail Secure Mailbox/)).not.toBeVisible()

    await nav.getByRole("button", { name: /^Secure Notes\s+\d+$/ }).click()
    await expect(item(/^Office Wi-Fi & Guest Access/)).toBeVisible()
    await expect(item(/^Hardware Wallet Master Seeds/)).not.toBeVisible()

    await nav.getByRole("button", { name: /^My Vault\s+\d+$/ }).click()
    await expect(item(/^Home Gateway & Router Specs/)).toBeVisible()
    await expect(item(/^Hardware Wallet Master Seeds/)).toBeVisible()

    await nav.getByRole("button", { name: /^Favorites\s+\d+$/ }).click()
    await expect(item(/^ProtonMail Secure Mailbox/)).toBeVisible()
    await expect(item(/^Hardware Wallet Master Seeds/)).toBeVisible()
    await expect(item(/^Alex Rivera - Passport & ID/)).toBeVisible()
    await expect(item(/^GitHub Enterprise/)).not.toBeVisible()

    await search.fill("Proton")
    await expect(page.getByRole("button", { name: "Clear search" })).toBeVisible()
    await expect(item(/^ProtonMail Secure Mailbox/)).toBeVisible()
    await expect(item(/^Hardware Wallet Master Seeds/)).not.toBeVisible()

    await page.getByRole("button", { name: "Clear search" }).click()
    await expect(search).toHaveValue("")
    await expect(item(/^Hardware Wallet Master Seeds/)).toBeVisible()

    await search.fill("task-7-no-match")
    await expect(page.getByText("No matching items")).toBeVisible()
    await page.getByRole("button", { name: "Clear filters" }).click()
    await expect(search).toHaveValue("")
    await expect(item(/^GitHub Enterprise/)).toBeVisible()
    await expect(item(/^AWS Console - Root Admin/)).toBeVisible()
  })

  test("requests normalized-host favicons and preserves category fallbacks", async ({ page }) => {
    const faviconRequests: string[] = []
    const faviconPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    )

    await page.route(/\/icons\/[^/]+\/icon\.png\?fallback=error$/u, async (route) => {
      const requestUrl = new URL(route.request().url())
      const path = `${requestUrl.pathname}${requestUrl.search}`
      faviconRequests.push(path)

      if (path === "/icons/aws.amazon.com/icon.png?fallback=error") {
        await route.fulfill({ status: 404, contentType: "image/png" })
        return
      }

      await route.fulfill({ status: 200, contentType: "image/png", body: faviconPng })
    })

    await page.goto("/demo/all-items")

    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    const item = (name: RegExp) => itemList.getByRole("button", { name })
    const successfulItem = item(/^GitHub Enterprise/)
    const failedItem = item(/^AWS Console - Root Admin/)
    const noUrlItem = item(/^Acme Corporate Platinum/)
    const unsupportedUrlItem = item(/^Production Bastion Gateway/)

    const successfulFavicon = successfulItem.locator("img")
    await expect(successfulFavicon).toBeVisible()
    await expect(successfulFavicon).toHaveAttribute("src", "/icons/github.company.internal/icon.png?fallback=error")
    await expect(successfulFavicon).toHaveAttribute("alt", "")
    await expect(successfulFavicon).toHaveAttribute("aria-hidden", "true")
    await expect(successfulFavicon).toHaveAttribute("loading", "lazy")
    await expect(successfulFavicon).toHaveAttribute("decoding", "async")
    await expect(successfulItem.locator("svg").first()).toHaveClass(/invisible/)

    await expect(failedItem.locator("img")).toHaveCount(0)
    await expect(failedItem.locator("svg").first()).toBeVisible()

    await expect(noUrlItem.locator("img")).toHaveCount(0)
    await expect(noUrlItem.locator("svg").first()).toBeVisible()

    await expect(unsupportedUrlItem.locator("img")).toHaveCount(0)
    await expect(unsupportedUrlItem.locator("svg").first()).toBeVisible()
    expect(faviconRequests).toContain("/icons/github.company.internal/icon.png?fallback=error")
    expect(faviconRequests).toContain("/icons/aws.amazon.com/icon.png?fallback=error")
    expect(faviconRequests.some((path) => path.includes("bastion.us-east-1.acme.net"))).toBe(false)
  })

  test("adds, edits, clones, and saves a favorite personal item", async ({ page }) => {
    await page.goto("/demo/all-items")

    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    const item = (name: RegExp) => itemList.getByRole("button", { name })
    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    const title = "Task 7 Browser Item"
    const editedTitle = `${title} Edited`

    await page.getByRole("button", { name: "New Item", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "New Vault Item" })).toBeVisible()
    await page.locator("#item-title").fill(title)
    await page.locator("#item-favorite-label").click()
    await page.getByRole("button", { name: "Save Item", exact: true }).first().click()
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible()
    await expect(item(new RegExp(`^${title}`))).toBeVisible()

    await nav.getByRole("button", { name: /^Favorites\s+\d+$/ }).click()
    await expect(item(new RegExp(`^${title}`))).toBeVisible()

    await nav.getByRole("button", { name: /^All Items\s+\d+$/ }).click()
    await page.getByRole("button", { name: "Edit", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Edit Item" })).toBeVisible()
    await page.locator("#item-title").fill(editedTitle)
    await page.locator("#item-favorite-label").click()
    await page.getByRole("button", { name: "Save Item", exact: true }).first().click()
    await expect(page.getByRole("heading", { level: 2, name: editedTitle })).toBeVisible()
    await expect(item(new RegExp(`^${editedTitle}`))).toBeVisible()

    await nav.getByRole("button", { name: /^Favorites\s+\d+$/ }).click()
    await expect(item(new RegExp(`^${editedTitle}`))).not.toBeVisible()

    await nav.getByRole("button", { name: /^All Items\s+\d+$/ }).click()
    await page.getByRole("button", { name: "Clone", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: `Clone - ${editedTitle}` })).toBeVisible()
    await expect(item(new RegExp(`^Clone - ${editedTitle}`))).toBeVisible()
  })

  test("resets copied and revealed password state when selecting another item", async ({ page }) => {
    await page.goto("/demo/login")

    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    const passwordRow = () =>
      page
        .locator("div.group")
        .filter({ has: page.getByText("Password", { exact: true }) })
        .first()

    await expect(page.getByRole("heading", { level: 3, name: "Password History" })).toBeVisible()
    await expect(passwordRow().getByRole("button", { name: "Show password", exact: true })).toBeVisible()
    await passwordRow().getByRole("button", { name: "Show password", exact: true }).click()
    await expect(passwordRow().getByRole("button", { name: "Hide password", exact: true })).toBeVisible()
    await passwordRow().getByRole("button", { name: "Copy password", exact: true }).click()
    await expect(passwordRow().getByRole("button", { name: "Copied password", exact: true })).toBeVisible()

    await itemList.getByRole("button", { name: /^AWS Console - Root Admin/ }).click()
    await expect(page.getByRole("heading", { level: 3, name: "Password History" })).toHaveCount(0)
    await expect(passwordRow().getByRole("button", { name: "Show password", exact: true })).toBeVisible()
    await expect(passwordRow().getByRole("button", { name: "Copy password", exact: true })).toBeVisible()
  })

  test("moves an active item to trash and preserves it in the trash route", async ({ page }) => {
    await page.goto("/demo/all-items")

    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    await itemList.getByRole("button", { name: /^GitHub Enterprise/ }).click()
    await page.getByTitle("Move cipher to trash").click()

    const dialog = page.getByRole("dialog", { name: "Move to Trash" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Move to Trash", exact: true }).click()
    await expect(itemList.getByRole("button", { name: /^GitHub Enterprise/ })).toHaveCount(0)

    await page.goto("/demo/trash")
    await expect(
      page.getByRole("list", { name: "Vault Credentials" }).getByRole("button", { name: /^GitHub Enterprise/ }),
    ).toBeVisible()
  })

  test("restores a deleted item from trash and updates the shared counts", async ({ page }) => {
    await page.goto("/demo/trash")
    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    await expect(nav.getByRole("button", { name: "Trash 3", exact: true })).toBeVisible()
    await expect(nav.getByRole("button", { name: "My Vault 6", exact: true })).toBeVisible()
    await expect(nav.getByRole("button", { name: "Acme Corporation 11", exact: true })).toBeVisible()

    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    await itemList.getByRole("button", { name: /^Legacy Staging DB/ }).click()

    const detail = page.getByRole("article")
    await expect(detail.getByRole("button", { name: "Restore Cipher", exact: true })).toBeVisible()
    await detail.getByRole("button", { name: "Restore Cipher", exact: true }).click()
    await expect(itemList.getByRole("button", { name: /^Legacy Staging DB/ })).toHaveCount(0)
    await expect(nav.getByRole("button", { name: "Trash 2", exact: true })).toBeVisible()
    await expect(nav.getByRole("button", { name: "Acme Corporation 12", exact: true })).toBeVisible()

    await nav.getByRole("button", { name: /^All Items\s+\d+$/ }).click()
    await expect(
      page.getByRole("list", { name: "Vault Credentials" }).getByRole("button", { name: /^Legacy Staging DB/ }),
    ).toBeVisible()
  })

  test("permanently deletes a deleted item from trash", async ({ page }) => {
    await page.goto("/demo/trash")
    const itemList = page.getByRole("list", { name: "Vault Credentials" })
    await itemList.getByRole("button", { name: /^Deprecated OpenVPN Client Config/ }).click()

    const detail = page.getByRole("article")
    const deleteButton = detail.getByRole("button", { name: "Delete Permanently", exact: true })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()
    const dialog = page.getByRole("dialog", { name: "Delete Permanently" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Delete Permanently", exact: true }).click()
    await expect(itemList.getByRole("button", { name: /^Deprecated OpenVPN Client Config/ })).toHaveCount(0)
  })

  test("unlocks, relocks, and switches mobile vault tabs", async ({ page }) => {
    await page.goto("/demo/locked")
    await page.getByLabel("Master Password").fill("demo-master-password")
    await page.getByRole("button", { name: "Unlock Vault" }).click()
    await expect(page.getByText("Vault Decrypted & Unlocked")).toBeVisible()
    await page.getByRole("button", { name: "Re-lock Vault" }).click()
    await expect(page.getByRole("heading", { level: 2, name: "Vault is Locked" })).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/demo/all-items")
    const mobileTabs = page.getByRole("navigation", { name: "Vault sections" })
    await mobileTabs.getByRole("button", { name: "Vaults", exact: true }).click()
    await expect(page.getByRole("navigation", { name: "Vault Navigation" })).toBeVisible()
    await mobileTabs.getByRole("button", { name: "Items", exact: false }).click()
    await expect(page.getByRole("list", { name: "Vault Credentials" })).toBeVisible()
    await mobileTabs.getByRole("button", { name: "Details", exact: true }).click()
    await expect(page.getByRole("heading", { level: 2, name: "GitHub Enterprise" })).toBeVisible()
  })

  test("keeps every mobile detail action inside the detail panel", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/demo/secure-note")
    await page.getByRole("navigation", { name: "Vault sections" }).getByRole("button", { name: "Details" }).click()

    const detail = page.getByRole("article")
    const trashButton = detail.getByRole("button", { name: "Trash", exact: true })
    await expect(trashButton).toBeVisible()
    await expect
      .poll(() =>
        trashButton.evaluate((button) => {
          const buttonBounds = button.getBoundingClientRect()
          const detailBounds = button.closest("article")?.getBoundingClientRect()
          return detailBounds !== undefined && buttonBounds.right <= detailBounds.right
        }),
      )
      .toBe(true)
  })
})
