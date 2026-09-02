import { expect, test } from "@playwright/test"

test.describe("task 34 demo admin", () => {
  test("renders the admin route from a direct URL and switches local sections", async ({ page }) => {
    const response = await page.goto("/demo/admin")

    expect(response?.status(), "/demo/admin should serve the demo admin SPA").toBe(200)
    expect(new URL(page.url()).pathname).toBe("/demo/admin")
    await expect(page.getByRole("heading", { name: "OneWarden Administration" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Admin sections" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Settings", level: 2 })).toBeVisible()

    const loginResponse = await page.goto("/demo/admin/login")

    expect(loginResponse?.status(), "/demo/admin/login should serve the demo admin SPA").toBe(200)
    expect(new URL(page.url()).pathname).toBe("/demo/admin/login")
    await expect(page.getByRole("heading", { name: "Log in to demo administration" })).toBeVisible()
    await expect(page.getByLabel("Demo admin token")).toBeVisible()

    await page.goto("/demo/admin")

    await page.getByRole("button", { name: "Diagnostics" }).click()
    await expect(page.getByRole("heading", { name: "Diagnostics", level: 2 })).toBeVisible()
    await page.locator("summary").filter({ hasText: "Database" }).click()
    await expect(page.getByText("Last query completed in 4 ms.", { exact: true })).toBeVisible()
  })

  test("uses router history for demo admin login and replace navigation", async ({ page }) => {
    await page.goto("/demo")
    await page.getByRole("link").filter({ hasText: "Administration Workspace" }).click()
    await expect(page).toHaveURL(/\/demo\/admin$/)

    await page.getByRole("button", { name: "Preview admin login" }).click()
    await expect(page).toHaveURL(/\/demo\/admin\/login$/)
    await expect(page.getByRole("heading", { name: "Log in to demo administration" })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/demo\/admin$/)
    await expect(page.getByRole("heading", { name: "OneWarden Administration" })).toBeVisible()

    await page.goForward()
    await expect(page).toHaveURL(/\/demo\/admin\/login$/)
    await page.getByLabel("Demo admin token").fill("history-test-token")
    await page.getByRole("button", { name: "Enter admin workspace" }).click()
    await expect(page).toHaveURL(/\/demo\/admin$/)

    await page.goBack()
    await expect(page).toHaveURL(/\/demo\/admin$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/demo$/)
  })

  test("filters users and completes invite and confirmation feedback flows", async ({ page }) => {
    await page.goto("/demo")
    await page.getByRole("link").filter({ hasText: "Administration Workspace" }).click()
    await page.getByRole("button", { name: "Users" }).click()

    const search = page.getByRole("searchbox", { name: "Search users" })
    await search.fill("disabled")
    await expect(page.getByText("Jamie Patel", { exact: true })).toBeVisible()
    await expect(page.getByText("Alex Rivera", { exact: true })).toHaveCount(0)

    await page.getByRole("button", { name: "Invite user" }).click()
    await expect(page.getByRole("dialog", { name: "Invite user" })).toBeVisible()
    await page.getByRole("textbox", { name: "User email" }).fill("demo@example.com")
    await page.getByRole("button", { name: "Send invitation" }).click()
    await expect(page.getByRole("status")).toContainText("Invitation queued for the demo user.")

    await page.getByRole("button", { name: "Dismiss" }).click()
    await page.getByRole("button", { name: "View details" }).click()
    await page.getByRole("button", { name: "Delete user" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("Delete Jamie Patel?")
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByRole("status")).toContainText("Delete Jamie Patel Demo state confirmed.")
  })

  test("toggles settings, handles reset confirmation, and shows disabled organization state", async ({ page }) => {
    await page.goto("/demo")
    await page.getByRole("link").filter({ hasText: "Administration Workspace" }).click()

    await page.locator("summary").filter({ hasText: "General settings" }).click()
    const signups = page.getByRole("checkbox", { name: "Allow new signups" })
    await expect(signups).toBeChecked()
    await page.locator('label[for="admin-setting-signupsAllowed"]').click()
    await expect(signups).not.toBeChecked()

    await page.getByRole("button", { name: "Reset overrides" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("Reset overridden settings?")
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("alertdialog")).toHaveCount(0)

    await page.getByRole("button", { name: "Reset overrides" }).click()
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.getByRole("status")).toContainText("Reset overridden settings Demo state confirmed.")
    await expect(signups).toBeChecked()
    await expect(page.getByText("Overridden", { exact: true })).toHaveCount(0)

    await page.getByRole("button", { name: "Organizations" }).click()
    await page.getByRole("button", { name: "View details" }).last().click()
    await expect(page.getByRole("dialog", { name: "Organization details" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Enable organization" })).toBeEnabled()
  })
})
