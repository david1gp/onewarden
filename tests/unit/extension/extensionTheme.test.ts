import { afterEach, expect, test } from "bun:test"
import { extensionThemeInit } from "../../../src/extension/theme/extensionThemeInit.js"
import { extensionThemeNext } from "../../../src/extension/theme/extensionThemeNext.js"
import { extensionThemeSet } from "../../../src/extension/theme/extensionThemeSet.js"
import { extensionThemeStorageKey } from "../../../src/extension/theme/extensionThemeStorageKey.js"

const previousChrome = globalThis.chrome
const previousMatchMedia = window.matchMedia

afterEach(() => {
  globalThis.chrome = previousChrome
  window.matchMedia = previousMatchMedia
  document.documentElement.classList.remove("dark", "extension-theme-root")
})

test("extensionThemeInit applies persisted explicit light and dark themes", async () => {
  let storedTheme: unknown = "dark"
  globalThis.chrome = {
    storage: { local: { get: async () => ({ [extensionThemeStorageKey]: storedTheme }) } },
  } as typeof chrome

  expect(await extensionThemeInit()).toBe("dark")
  expect(document.documentElement.classList.contains("extension-theme-root")).toBe(true)
  expect(document.documentElement.classList.contains("dark")).toBe(true)

  storedTheme = "light"
  expect(await extensionThemeInit()).toBe("light")
  expect(document.documentElement.classList.contains("dark")).toBe(false)
})

test("extensionThemeInit uses the browser preference for missing, os, and invalid stored themes", async () => {
  let storedTheme: unknown
  window.matchMedia = ((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)",
  })) as typeof window.matchMedia
  globalThis.chrome = {
    storage: { local: { get: async () => ({ [extensionThemeStorageKey]: storedTheme }) } },
  } as typeof chrome

  for (const value of [undefined, "os", "sepia"]) {
    storedTheme = value
    document.documentElement.classList.remove("dark")

    expect(await extensionThemeInit()).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  }
})

test("extensionThemeSet preserves the popup two-theme persistence behavior", async () => {
  const saved: Record<string, unknown>[] = []
  globalThis.chrome = {
    storage: { local: { set: async (value: Record<string, unknown>) => void saved.push(value) } },
  } as typeof chrome

  await extensionThemeSet("light")
  await extensionThemeSet("os")

  expect(extensionThemeStorageKey).toBe("extensionPopupTheme")
  expect(saved).toEqual([{ [extensionThemeStorageKey]: "light" }])
  expect(document.documentElement.classList.contains("dark")).toBe(false)
  expect(extensionThemeNext("light")).toBe("dark")
  expect(extensionThemeNext("dark")).toBe("light")
})
