import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { themeSet } from "#ui/interactive/theme/themeSignal.js"
import { themeVariant } from "#ui/interactive/theme/themeVariant.js"
import { AdminThemeSelector } from "../../../src/web/admin/AdminThemeSelector.jsx"

test("AdminThemeSelector persists explicit light, dark, and auto choices", () => {
  localStorage.setItem("theme", themeVariant.light)
  const rendered = render(() => <AdminThemeSelector />)

  try {
    const lightButton = rendered.getByRole("button", { name: "Light" })
    const darkButton = rendered.getByRole("button", { name: "Dark" })
    const autoButton = rendered.getByRole("button", { name: "Auto" })
    expect(lightButton.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(darkButton)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("theme")).toBe(themeVariant.dark)
    expect(darkButton.getAttribute("aria-pressed")).toBe("true")

    fireEvent.click(autoButton)
    expect(localStorage.getItem("theme")).toBe(themeVariant.os)
    expect(autoButton.getAttribute("aria-pressed")).toBe("true")
  } finally {
    rendered.unmount()
    themeSet(themeVariant.light, false)
    localStorage.removeItem("theme")
  }
})
