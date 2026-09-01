/** Secret kinds the full-window generator pane can produce. */
export const extensionFullWindowGeneratorMode = {
  passphrase: "passphrase",
  password: "password",
} as const

export type ExtensionFullWindowGeneratorMode = keyof typeof extensionFullWindowGeneratorMode
