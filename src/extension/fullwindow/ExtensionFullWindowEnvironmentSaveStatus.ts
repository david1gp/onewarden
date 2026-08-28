/** Lifecycle of the full-window environment settings submission. */
export const extensionFullWindowEnvironmentSaveStatus = {
  idle: "idle",
  saving: "saving",
  saved: "saved",
  error: "error",
} as const

export type ExtensionFullWindowEnvironmentSaveStatus = keyof typeof extensionFullWindowEnvironmentSaveStatus
