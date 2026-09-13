import { expect, test } from "@playwright/test"
import { demoBrowserSessionReset } from "./helpers/demoBrowserSessionReset.js"

test.describe("task 4 extension demo coverage", () => {
  test.beforeEach(async ({ page }) => {
    await demoBrowserSessionReset(page)
  })

  test("renders the extension gallery and representative visual states", async ({ page }) => {
    const response = await page.goto("/demo/extension")

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: "Extension surfaces" })).toBeVisible()

    for (const sectionHeading of ["Popup", "Full-window vault, generator, and settings", "Passkey consent"]) {
      await expect(page.getByRole("heading", { level: 2, name: sectionHeading })).toBeVisible()
    }

    const frameLabels = [
      "Ready · copied feedback",
      "Error · retry available",
      "Vault · cipher extras and custom fields",
      "Vault · attachment delete confirmation",
      "Vault · password restore confirmation",
      "Vault pane · secure note delete confirmation",
      "Vault pane · card delete confirmation",
      "Vault pane · identity delete confirmation",
      "Vault pane · SSH key delete confirmation",
      "Vault resources · folder delete confirmation",
      "Vault resources · collection delete confirmation",
      "Generator · deterministic local fixture",
      "Settings · save errors",
      "Vault · signed out",
      "Vault · locked",
      "Load error",
      "Fresh verification required",
      "Candidate selection · personal and read-only organization",
      "No matching candidate",
    ]

    for (const frameLabel of frameLabels) {
      const frame = page.getByRole("article", { name: `${frameLabel} frame` })
      await expect(frame).toBeVisible()
      await expect(frame.getByRole("heading", { name: frameLabel })).toHaveCount(0)
    }

    const scrollableFrameLabels = frameLabels.slice(2)
    for (const frameLabel of scrollableFrameLabels) {
      await expect(
        page.getByRole("article", { name: `${frameLabel} frame` }).locator(":scope > section"),
      ).toHaveAttribute("tabindex", "0")
    }

    await expect(
      page.getByRole("article", { name: "Ready · copied feedback frame" }).locator(":scope > section"),
    ).toHaveAttribute("tabindex", "0")
    await expect(
      page.getByRole("article", { name: "Error · retry available frame" }).locator(":scope > section"),
    ).toHaveAttribute("tabindex", "0")

    const idReferences = await page.locator("[id]").evaluateAll((elements) => {
      const ids = elements.map((element) => element.id)
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
      const brokenReferences = Array.from(document.querySelectorAll("label[for], [aria-labelledby]"))
        .flatMap((element) => [
          element.getAttribute("for"),
          ...(element.getAttribute("aria-labelledby")?.split(/\s+/) ?? []),
        ])
        .filter((id): id is string => id !== null)
        .filter((id) => id.length > 0 && !document.getElementById(id))

      return { duplicateIds, brokenReferences }
    })

    expect(idReferences).toEqual({ duplicateIds: [], brokenReferences: [] })
  })

  test("keeps the first three popup examples readable at narrow and normal widths", async ({ page }) => {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/demo/extension")

      for (const frameLabel of ["Ready · copied feedback", "Loading", "Signed out"]) {
        const frame = page.getByRole("article", { name: `${frameLabel} frame`, exact: true })
        const preview = frame.locator(":scope > section")
        const navigation = preview.getByRole("navigation")

        await expect(frame).toBeVisible()
        await expect(navigation).toBeVisible()
        await expect(navigation.getByRole("group", { name: "Vault and generator" })).toBeVisible()
        await expect(navigation.getByRole("button", { name: "Settings" })).toHaveText("")
        await expect(navigation.getByRole("button", { name: /Switch to (?:light|dark) theme/ })).toHaveText("")
        await expect(navigation.getByText("Popup content")).toHaveCount(0)
        await expect(navigation.getByRole("button")).toHaveCount(4)
        await expect(preview.getByText("OneWarden", { exact: true })).toHaveCount(0)
        await expect(preview.getByText("mail.northstar.test", { exact: true })).toHaveCount(0)
        await expect(preview.getByLabel("Active site", { exact: true })).toHaveCount(0)
        expect(
          await navigation.getByRole("button").evaluateAll((buttons) => {
            const tops = buttons.map((button) => button.getBoundingClientRect().top)
            return Math.max(...tops) - Math.min(...tops) < 1
          }),
        ).toBe(true)
        expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
        expect(
          await navigation
            .getByRole("button")
            .evaluateAll((buttons) => buttons.every((button) => button.scrollWidth <= button.clientWidth)),
        ).toBe(true)
      }
    }
  })

  test("keeps the popup theme action synchronized with its isolated demo frame", async ({ page }) => {
    await page.goto("/demo/extension")

    const frame = page.getByRole("article", { name: "Ready · copied feedback frame", exact: true })
    const preview = frame.locator(":scope > section")
    const navigation = preview.getByRole("navigation")
    const theme = navigation.getByRole("button", { name: "Switch to dark theme" })

    await expect(preview).toHaveAttribute("data-extension-theme", "light")
    await expect(theme).toHaveAttribute("title", "Switch to dark theme")
    await theme.click()

    await expect(preview).toHaveAttribute("data-extension-theme", "dark")
    await expect(navigation.getByRole("button", { name: "Switch to light theme" })).toHaveAttribute(
      "title",
      "Switch to light theme",
    )
    await expect(frame.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true")
  })
})
