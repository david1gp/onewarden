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
      "Vault · selected login and copied field",
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
      await expect(page.getByRole("article", { name: `${frameLabel} frame` }).locator(":scope > div")).toHaveAttribute(
        "tabindex",
        "0",
      )
    }

    await expect(
      page.getByRole("article", { name: "Ready · copied feedback frame" }).locator("[tabindex='0']"),
    ).toHaveCount(0)
    await expect(
      page.getByRole("article", { name: "Error · retry available frame" }).locator("[tabindex='0']"),
    ).toHaveCount(0)

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
})
