import type { ThemeVariant } from "#ui/interactive/theme/themeVariant.js"

export function extensionThemeNext(theme: ThemeVariant): Exclude<ThemeVariant, "os"> {
  return theme === "dark" ? "light" : "dark"
}
