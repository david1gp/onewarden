/** Top-level panes the full-window vault can show. */
export const extensionFullWindowPane = {
  vault: "vault",
  settings: "settings",
} as const

export type ExtensionFullWindowPane = keyof typeof extensionFullWindowPane
