/** Top-level panes the full-window vault can show. */
export const extensionFullWindowPane = {
  vault: "vault",
  generator: "generator",
  settings: "settings",
  auth: "auth",
} as const

export type ExtensionFullWindowPane = keyof typeof extensionFullWindowPane
