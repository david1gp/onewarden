/** Server region choices offered by the full-window settings pane. */
export const extensionFullWindowRegion = {
  us: "us",
  eu: "eu",
  selfHosted: "selfHosted",
} as const

export type ExtensionFullWindowRegion = keyof typeof extensionFullWindowRegion
