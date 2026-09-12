import * as v from "valibot"
import {
  getThemeFromBrowserPref,
  setThemeToBrowser,
  type ThemeVariant,
  themeSchema,
} from "#ui/interactive/theme/themeVariant.js"
import { extensionThemeStorageKey } from "./extensionThemeStorageKey.js"

export async function extensionThemeInit(): Promise<ThemeVariant> {
  const stored = await chrome.storage.local.get(extensionThemeStorageKey)
  const parsed = v.safeParse(themeSchema, stored[extensionThemeStorageKey])
  const theme = parsed.success && parsed.output !== "os" ? parsed.output : getThemeFromBrowserPref()
  document.documentElement.classList.add("extension-theme-root")
  setThemeToBrowser(theme)
  return theme
}
