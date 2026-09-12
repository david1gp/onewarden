import { setThemeToBrowser, type ThemeVariant } from "#ui/interactive/theme/themeVariant.js"
import { extensionThemeStorageKey } from "./extensionThemeStorageKey.js"

export async function extensionThemeSet(theme: ThemeVariant): Promise<void> {
  if (theme === "os") return
  setThemeToBrowser(theme)
  await chrome.storage.local.set({ [extensionThemeStorageKey]: theme })
}
