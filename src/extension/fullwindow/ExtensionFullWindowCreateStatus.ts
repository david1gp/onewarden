/** Lifecycle of the full-window create-login submission. */
export const extensionFullWindowCreateStatus = {
  idle: "idle",
  saving: "saving",
  saved: "saved",
  error: "error",
} as const

export type ExtensionFullWindowCreateStatus = keyof typeof extensionFullWindowCreateStatus
