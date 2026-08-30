import { expect, test } from "@playwright/test"
import {
  browserAuthenticatedSessionSetup,
  browserAuthenticatedSessionUnlock,
} from "./helpers/browserAuthenticatedSessionSetup.js"
import { browserCipherApiMockSetup } from "./helpers/browserCipherApiMockSetup.js"

test.describe("task 35 cipher UI", () => {
  test.beforeEach(async ({ page }) => {
    await browserAuthenticatedSessionSetup(page)
    await browserCipherApiMockSetup(page)
  })

  test("serves direct cipher SPA routes when authenticated", async ({ page }) => {
    for (const path of ["/ciphers/new", "/ciphers/cipher-login-1", "/ciphers/cipher-login-1/edit"]) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should serve the SPA`).not.toBe(404)
      await browserAuthenticatedSessionUnlock(page)
      await expect(page.locator("main")).toBeVisible()
    }
  })

  test("renders cipher detail views for logins, secure notes, credit cards, and identities", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await expect(page.getByRole("heading", { name: "OneWarden" })).toBeVisible()

    // 1. Login view
    await expect(page.getByRole("heading", { name: "GitHub Work Account" })).toBeVisible()
    await expect(page.getByText("alex.rivera@acme.com").last()).toBeVisible()
    await expect(page.getByText("JBSWY3DPEHPK3PXP")).toBeVisible()

    // Password reveal toggle
    await expect(page.getByText("••••••••••••••••••••")).toBeVisible()
    await page.getByRole("button", { name: "Show password" }).click()
    await expect(page.getByText("SuperSecretPassword123!")).toBeVisible()
    await page.getByRole("button", { name: "Hide password" }).click()
    await expect(page.getByText("••••••••••••••••••••")).toBeVisible()

    // Copy action
    await page.getByRole("button", { name: "Copy username" }).click()
    await expect(page.getByRole("button", { name: "Copied username" })).toBeVisible()

    // 2. Select Secure Note
    await page.getByRole("button", { name: /Server SSH Config Notes/i }).click()
    await expect(page.getByRole("heading", { name: "Server SSH Config Notes" })).toBeVisible()
    await expect(page.getByText("Host prod-bastion").last()).toBeVisible()

    // 3. Select Credit Card
    await page.getByRole("button", { name: /Corporate Visa Platinum/i }).click()
    await expect(page.getByRole("heading", { name: "Corporate Visa Platinum" })).toBeVisible()
    await expect(page.getByText("Alex Rivera").last()).toBeVisible()
    await expect(page.getByText("•••• •••• •••• 9010")).toBeVisible()
    await page.getByRole("button", { name: "Show card number" }).click()
    await expect(page.getByText("4000 1234 5678 9010")).toBeVisible()

    // 4. Select Identity
    await page.getByRole("button", { name: /Alex Rivera Personal Profile/i }).click()
    await expect(page.getByRole("heading", { name: "Alex Rivera Personal Profile" })).toBeVisible()
    await expect(page.getByText("Mr. Alex J. Rivera")).toBeVisible()
    await expect(page.getByText("100 Market Street")).toBeVisible()
  })

  test("exercises create cipher flow for new login item", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await page.getByRole("button", { name: "New" }).click()

    await expect(page.getByRole("heading", { name: "Add New Cipher Item" })).toBeVisible()
    await page.locator("#cipher-form-name").fill("AWS Production Console")
    await page.locator("#cipher-username").fill("devops@acme.com")
    await page.locator("#cipher-password").fill("AwsMasterKey2026!#$")
    await page.locator("#cipher-uri").fill("https://signin.aws.amazon.com/console")

    await page.locator("form").getByRole("button", { name: "Save Item" }).last().click()

    await expect(page.getByRole("button", { name: /AWS Production Console/i })).toBeVisible()
  })

  test("exercises create flows for secure notes, cards, identities, and custom fields", async ({ page }) => {
    const createItem = async (type: string, name: string, fillFields: () => Promise<void>) => {
      await page.goto("/ciphers/new")
      await browserAuthenticatedSessionUnlock(page)
      await page.locator("#cipher-form-type").selectOption(type)
      await page.locator("#cipher-form-name").fill(name)
      await fillFields()
      await page.locator("form").getByRole("button", { name: "Save Item" }).last().click()
      await expect(page.getByRole("heading", { name })).toBeVisible()
    }

    await createItem("2", "Incident Recovery Notes", async () => {
      await page.locator("#cipher-secure-note-content").fill("Recovery seed and emergency access instructions")
      await page.getByPlaceholder("New field label...").fill("Classification")
      await page.getByRole("button", { name: "Add Field" }).click()
      await page.getByLabel("Field value 1").fill("Confidential")
    })

    await createItem("3", "Cloud Billing Card", async () => {
      await page.locator("#cipher-cardholder-name").fill("Alex Rivera")
      await page.locator("#cipher-card-number").fill("4000123456789010")
      await page.locator("#cipher-card-exp-year").fill("2029")
      await page.locator("#cipher-card-cvv").fill("789")
    })

    await createItem("4", "Emergency Contact Identity", async () => {
      await page.locator("#cipher-identity-first-name").fill("Alex")
      await page.locator("#cipher-identity-last-name").fill("Rivera")
      await page.locator("#cipher-identity-address3").fill("Building B")
      await page.locator("#cipher-identity-username").fill("arivera")
    })
  })

  test("exercises edit cipher flow and updates item reactively", async ({ page }) => {
    await page.goto("/ciphers/cipher-login-1/edit")
    await browserAuthenticatedSessionUnlock(page)
    await expect(page.getByRole("heading", { name: /Edit Cipher/i })).toBeVisible()

    await page.locator("#cipher-form-name").fill("GitHub Work Account (Updated)")
    await page.locator("form").getByRole("button", { name: "Save Item" }).last().click()

    await expect(page.getByRole("heading", { name: "GitHub Work Account (Updated)" })).toBeVisible()
  })

  test("exercises clone cipher flow", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await page.getByRole("button", { name: "Clone" }).click()

    await expect(page.getByRole("button", { name: /GitHub Work Account \(Clone\)/i })).toBeVisible()
  })

  test("exercises archive, trash, restore, and permanent delete flows", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)

    // Archive
    await page.getByRole("button", { name: "Archive" }).click()
    await expect(page.getByText("Archived")).toBeVisible()
    await expect(page.getByRole("button", { name: "Unarchive" })).toBeVisible()

    // Unarchive
    await page.getByRole("button", { name: "Unarchive" }).click()
    await expect(page.getByText("Archived")).not.toBeVisible()

    // Soft delete / Move to Trash
    await page.getByTitle("Move cipher to trash").click()
    const deleteDialog = page.getByRole("dialog")
    await expect(deleteDialog.getByRole("heading", { name: "Move to Trash" })).toBeVisible()
    await deleteDialog.getByRole("button", { name: "Move to Trash" }).click()

    // Verify item in trash state banner
    await expect(page.getByText("This cipher is in your Trash")).toBeVisible()
    await expect(page.getByRole("button", { name: "Restore Cipher" })).toBeVisible()

    // Restore cipher
    await page.getByRole("button", { name: "Restore Cipher" }).click()
    await expect(page.getByText("This cipher is in your Trash")).not.toBeVisible()

    // Delete permanently
    await page.getByTitle("Move cipher to trash").click()
    await page.getByRole("dialog").getByRole("button", { name: "Move to Trash" }).click()
    await page.getByRole("button", { name: "Delete Permanently" }).click()
    const permanentDeleteDialog = page.getByRole("dialog")
    await expect(permanentDeleteDialog.getByRole("heading", { name: "Delete Permanently" })).toBeVisible()
    await permanentDeleteDialog.getByRole("button", { name: "Delete Permanently" }).click()
  })

  test("exercises organization share and collection management flows", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await page.getByRole("button", { name: "Share", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Share to Organization" })).toBeVisible()
    await page.locator("#cipher-share-org-id").fill("org-acme-prod")
    await page.locator("#cipher-share-collections").fill("col-engineering, col-devops")
    await page.getByRole("button", { name: "Share Item" }).click()

    await expect(page.getByText("Organization: org-acme-prod")).toBeVisible()
    await expect(page.getByText("col-engineering")).toBeVisible()
  })

  test("exercises password history dialog and copy flow", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await page.getByRole("button", { name: "View password history" }).click()

    const historyDialog = page.getByRole("dialog")
    await expect(historyDialog.getByRole("heading", { name: "Password History" })).toBeVisible()
    await expect(historyDialog.getByText("OldPassword2025!")).not.toBeVisible() // concealed initially

    await historyDialog.getByRole("button", { name: "Show password" }).first().click()
    await expect(historyDialog.getByText("OldPassword2025!")).toBeVisible()

    await historyDialog.getByRole("button", { name: "Copy past password" }).first().click()
    await expect(historyDialog.getByRole("button", { name: "Copied past password" })).toBeVisible()
  })

  test("exercises attachment upload and deletion flow", async ({ page }) => {
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)
    await expect(page.getByText("github-recovery-keys.txt")).toBeVisible()

    await page.getByLabel("Upload attachment file").setInputFiles({
      name: "new-recovery-notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("new recovery notes"),
    })
    await expect(page.getByText("new-recovery-notes.txt")).toBeVisible()

    // Delete existing attachments
    await page.getByRole("button", { name: "Delete attachment github-recovery-keys.txt" }).click()
    await expect(page.getByText("github-recovery-keys.txt")).not.toBeVisible()
    await page.getByRole("button", { name: "Delete attachment new-recovery-notes.txt" }).click()
    await expect(page.getByText("No attachments uploaded for this cipher item.")).toBeVisible()
  })

  test("keeps cipher layouts usable at mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await browserAuthenticatedSessionUnlock(page)

    await expect(page.getByRole("contentinfo").getByText("End-to-End Encrypted", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /Items/i })).toBeVisible()

    const viewportState = await page.locator("body").evaluate((body) => ({
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
    }))
    expect(viewportState.scrollWidth).toBeLessThanOrEqual(viewportState.clientWidth)
  })
})
