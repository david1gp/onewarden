/** Mutually exclusive top-level states the full-window vault can render. */
export const extensionFullWindowStatus = {
  loading: "loading",
  loggedOut: "loggedOut",
  locked: "locked",
  error: "error",
  ready: "ready",
} as const

export type ExtensionFullWindowStatus = keyof typeof extensionFullWindowStatus
