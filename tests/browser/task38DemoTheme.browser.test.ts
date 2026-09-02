import { expect, test } from "@playwright/test"
import { demoBrowserSessionReset } from "./helpers/demoBrowserSessionReset.js"

// The button renders its label as text, so the accessible name is "Light" /
// "Dark". The stable identifier across states is its title attribute.
const themeButtonTitle = /^Current theme: /

test.describe("task 38 demo theme toggle", () => {
  test.beforeEach(async ({ page }) => {
    await demoBrowserSessionReset(page)
  })

  test("toggles light and dark from the sidebar footer and persists the choice", async ({ page }) => {
    await page.goto("/demo/secure-note")

    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    const themeButton = nav.getByTitle(themeButtonTitle)
    const html = page.locator("html")

    // The Playwright project runs with colorScheme: light, so the resolved
    // starting theme is light and the `dark` class must be absent.
    await expect(themeButton).toBeVisible()
    await expect(html).not.toHaveClass(/dark/)

    await themeButton.click()
    await expect(html).toHaveClass(/dark/)
    expect(await page.evaluate(() => window.localStorage.getItem("theme"))).toBe("dark")

    await themeButton.click()
    await expect(html).not.toHaveClass(/dark/)
    expect(await page.evaluate(() => window.localStorage.getItem("theme"))).toBe("light")
  })

  test("restores the stored dark theme on reload", async ({ page }) => {
    await page.goto("/demo/secure-note")

    const themeButton = page.getByRole("navigation", { name: "Vault Navigation" }).getByTitle(themeButtonTitle)
    await themeButton.click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })

  test("fills a short mobile item-list viewport in both themes after reload", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/demo/secure-note")

    const itemsTab = page.getByRole("button", { name: /^Items \(/ })
    await itemsTab.click()

    const viewportCanvas = async () =>
      page.evaluate(() => {
        const element = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 1)
        let surface = element
        let bottom = "rgba(0, 0, 0, 0)"
        while (surface) {
          bottom = window.getComputedStyle(surface).backgroundColor
          if (bottom !== "rgba(0, 0, 0, 0)") break
          surface = surface.parentElement
        }
        return {
          html: window.getComputedStyle(document.documentElement).backgroundColor,
          body: window.getComputedStyle(document.body).backgroundColor,
          root: window.getComputedStyle(document.querySelector("#root") as Element).backgroundColor,
          bottom,
        }
      })

    await expect.poll(viewportCanvas).toMatchObject({
      html: "rgb(248, 250, 252)",
      body: "rgb(248, 250, 252)",
      root: "rgb(248, 250, 252)",
    })
    expect(
      await page.evaluate(
        () => window.getComputedStyle(document.querySelector("#vault-items-column") as Element).backgroundColor,
      ),
    ).toMatch(/rgb\(/)

    await page.evaluate(() => window.localStorage.setItem("theme", "dark"))
    await page.reload()
    await itemsTab.click()

    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect.poll(viewportCanvas).toMatchObject({
      html: "rgb(2, 6, 23)",
      body: "rgb(2, 6, 23)",
      root: "rgb(2, 6, 23)",
    })
  })

  test("renders readable light-mode surfaces on the secure note page", async ({ page }) => {
    await page.goto("/demo/secure-note")

    const nav = page.getByRole("navigation", { name: "Vault Navigation" })
    await expect(nav.getByTitle(themeButtonTitle)).toBeVisible()

    // In light mode the workspace must use light surfaces with dark text, so a
    // dark-on-dark or light-on-light regression fails here. Colors are resolved
    // through the canvas so this stays independent of the CSS color space
    // Tailwind emits (currently `oklch`).
    const luminance = await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const style = window.getComputedStyle(element)
      const canvas = document.createElement("canvas")
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext("2d")
      if (!context) return null
      const measure = (color: string) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data
        return (0.299 * (r ?? 0) + 0.587 * (g ?? 0) + 0.114 * (b ?? 0)) / 255
      }
      return { background: measure(style.backgroundColor), text: measure(style.color) }
    }, 'nav[aria-label="Vault Navigation"]')

    expect(luminance).not.toBeNull()
    expect(luminance?.background ?? 0).toBeGreaterThan(0.6)
    expect(luminance?.text ?? 1).toBeLessThan(0.4)
  })

  test("renders dark surfaces on the secure note page after switching to dark", async ({ page }) => {
    await page.goto("/demo/secure-note")
    await page.getByRole("navigation", { name: "Vault Navigation" }).getByTitle(themeButtonTitle).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    const luminance = await page.evaluate((selector) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const style = window.getComputedStyle(element)
      const canvas = document.createElement("canvas")
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext("2d")
      if (!context) return null
      const measure = (color: string) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data
        return (0.299 * (r ?? 0) + 0.587 * (g ?? 0) + 0.114 * (b ?? 0)) / 255
      }
      return { background: measure(style.backgroundColor), text: measure(style.color) }
    }, 'nav[aria-label="Vault Navigation"]')

    expect(luminance).not.toBeNull()
    expect(luminance?.background ?? 1).toBeLessThan(0.4)
    expect(luminance?.text ?? 0).toBeGreaterThan(0.6)
  })
})
