/** Top-level panes the full-window vault can show. */
export const extensionFullWindowPane = {
  vault: "vault",
  create: "create",
  settings: "settings",
} as const

export type ExtensionFullWindowPane = keyof typeof extensionFullWindowPane
