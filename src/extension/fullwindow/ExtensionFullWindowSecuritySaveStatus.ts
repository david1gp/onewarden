export const extensionFullWindowSecuritySaveStatus = {
  idle: "idle",
  saving: "saving",
  saved: "saved",
  error: "error",
} as const

export type ExtensionFullWindowSecuritySaveStatus =
  (typeof extensionFullWindowSecuritySaveStatus)[keyof typeof extensionFullWindowSecuritySaveStatus]
