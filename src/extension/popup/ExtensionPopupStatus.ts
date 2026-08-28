/** Mutually exclusive top-level states the popup can render. */
export const extensionPopupStatus = {
  loading: "loading",
  loggedOut: "loggedOut",
  locked: "locked",
  error: "error",
  ready: "ready",
} as const

export type ExtensionPopupStatus = keyof typeof extensionPopupStatus
