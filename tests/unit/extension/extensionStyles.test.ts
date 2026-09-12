import { expect, test } from "bun:test"

const extensionStyles = await Bun.file(new URL("../../../src/extension/extensionStyles.css", import.meta.url)).text()
const extensionThemeStyles = await Bun.file(
  new URL("../../../src/extension/extensionThemeStyles.css", import.meta.url),
).text()

const semanticColors = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-hover",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-hover",
  "destructive-foreground",
  "destructive-surface",
  "destructive-surface-foreground",
  "info",
  "success",
  "warning",
  "warning-border",
  "warning-surface",
  "border",
  "input",
  "ring",
  "control-disabled",
  "control-disabled-foreground",
] as const

function colorLuminance(hex: string): number {
  const channelLinearize = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const red = channelLinearize(Number.parseInt(hex.slice(1, 3), 16) / 255)
  const green = channelLinearize(Number.parseInt(hex.slice(3, 5), 16) / 255)
  const blue = channelLinearize(Number.parseInt(hex.slice(5, 7), 16) / 255)
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

function colorContrast(first: string, second: string): number {
  const firstLuminance = colorLuminance(first)
  const secondLuminance = colorLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05)
}

test("extension styles define every semantic color in light and dark themes", () => {
  expect(extensionStyles).toContain("@theme static")
  expect(extensionStyles).toContain('@import "./extensionThemeStyles.css"')
  expect(extensionThemeStyles).toContain(".extension-theme-root.dark")

  for (const color of semanticColors) {
    expect(extensionThemeStyles.match(new RegExp(`--color-${color}:`, "g"))).toHaveLength(2)
  }

  expect(extensionThemeStyles).toContain("--color-placeholder: var(--color-muted-foreground)")
})

test("extension styles surface every standalone document root", () => {
  expect(extensionThemeStyles).toMatch(/html\.extension-theme-root,\s*html\.extension-theme-root body,/)
  expect(extensionThemeStyles).toContain("background-color: var(--color-background)")
  expect(extensionThemeStyles).toContain("color: var(--color-foreground)")
  expect(extensionThemeStyles).toMatch(/\.extension-theme-root ::placeholder\s*{\s*color: var\(--color-placeholder\)/)
})

test("extension primary and selected control colors meet AA in every visual state", () => {
  const foregroundBackgroundPairs = [
    ["#ffffff", "#1d4ed8"],
    ["#ffffff", "#1e40af"],
    ["#0f172a", "#60a5fa"],
    ["#0f172a", "#93c5fd"],
    ["#334155", "#cbd5e1"],
    ["#e2e8f0", "#334155"],
    ["#1e3a8a", "#dbeafe"],
    ["#dbeafe", "#1e3a8a"],
  ] as const

  for (const [foreground, background] of foregroundBackgroundPairs) {
    expect(colorContrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  }

  expect(extensionThemeStyles).toContain(".extension-primary-control")
  expect(extensionThemeStyles).toContain(".extension-selected-control:is(")
  expect(extensionThemeStyles).toContain(":focus-visible")
  expect(extensionThemeStyles).toContain(":disabled:hover")
  expect(extensionThemeStyles).toContain("opacity: 1")
  expect(extensionThemeStyles).toMatch(
    /\.extension-selected-control:is\([^}]+\.extension-muted-text\s*{\s*color: var\(--color-primary-foreground\) !important/,
  )
})

test("extension form, selection, icon, disabled, and loading states have owned styles", () => {
  for (const className of [
    "extension-input-control",
    "extension-textarea-control",
    "extension-select-control",
    "extension-checkbox-input",
    "extension-switch-control",
    "extension-credential-option",
    "extension-icon-control",
  ]) {
    expect(extensionThemeStyles).toContain(`.${className}`)
  }

  expect(extensionThemeStyles).toMatch(/\.extension-checkbox-input:focus-visible/)
  expect(extensionThemeStyles).toMatch(/\[role="radio"\]\[aria-checked="true"\]/)
  expect(extensionThemeStyles).toMatch(/\.extension-switch-control\[data-disabled="true"\]/)
  expect(extensionThemeStyles).toMatch(/\.extension-credential-option:disabled/)
  expect(extensionThemeStyles).toMatch(/\.extension-icon-control\[aria-disabled="true"\]/)
  expect(extensionThemeStyles).toContain("-webkit-text-fill-color: var(--color-control-disabled-foreground)")
})

test("extension surfaces and required boundaries use semantic colors", () => {
  for (const className of [
    "extension-page-surface",
    "extension-card-surface",
    "extension-subtle-surface",
    "extension-boundary",
    "extension-badge",
    "extension-separator",
    "extension-separator-with-text",
  ]) {
    expect(extensionThemeStyles).toContain(`.${className}`)
  }

  expect(extensionThemeStyles).toMatch(/\.extension-card-surface\s*{[^}]*var\(--color-card\)/s)
  expect(extensionThemeStyles).toMatch(/\.extension-card-surface\s*{[^}]*var\(--color-border\)/s)
  expect(extensionThemeStyles).toMatch(/\.extension-badge\s*{[^}]*var\(--color-muted\)/s)
  expect(extensionThemeStyles).toMatch(/\.extension-badge\s*{[^}]*var\(--color-border\)/s)
  expect(extensionThemeStyles).toMatch(/\.extension-separator > div,[^}]*var\(--color-border\)/s)
  expect(extensionThemeStyles).toMatch(/\.extension-warning-surface\s*{[^}]*border: 1px solid/s)
  expect(extensionThemeStyles).toMatch(/\.extension-destructive-surface\s*{[^}]*border: 1px solid/s)

  for (const [boundary, surface] of [
    ["#64748b", "#ffffff"],
    ["#94a3b8", "#0f172a"],
    ["#64748b", "#f1f5f9"],
    ["#94a3b8", "#1e293b"],
  ] as const) {
    expect(colorContrast(boundary, surface)).toBeGreaterThanOrEqual(3)
  }
})

test("extension status colors remain readable in light and dark surfaces", () => {
  for (const [foreground, background] of [
    ["#1e40af", "#ffffff"],
    ["#93c5fd", "#0f172a"],
    ["#166534", "#ffffff"],
    ["#86efac", "#0f172a"],
    ["#713f12", "#fef3c7"],
    ["#fde68a", "#422006"],
    ["#991b1b", "#fef2f2"],
    ["#fecaca", "#450a0a"],
  ] as const) {
    expect(colorContrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  }

  for (const className of [
    "extension-muted-text",
    "extension-info-text",
    "extension-success-text",
    "extension-error-text",
    "extension-info-surface",
    "extension-warning-surface",
    "extension-destructive-surface",
    "extension-destructive-control",
    "extension-range-control",
  ]) {
    expect(extensionThemeStyles).toContain(`.${className}`)
  }
})

test("production extension views do not bypass the semantic color contract", async () => {
  const sourcePaths = Array.from(
    new Bun.Glob("src/extension/{auth,fullwindow,passkey-consent,popup}/**/*.tsx").scanSync({ cwd: process.cwd() }),
  )
  expect(sourcePaths.length).toBeGreaterThan(0)
  const sources = await Promise.all(sourcePaths.map(async (path) => [path, await Bun.file(path).text()] as const))
  const localPaletteClass =
    /(?:text|bg|border|ring|accent)-(?:slate|red|green|blue|amber|gray|zinc|neutral|stone|orange|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\S+/

  for (const [path, source] of sources) {
    expect(source, path).not.toMatch(localPaletteClass)
  }
})
