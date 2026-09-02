export const pageNameDemo = {
  directory: "directory",
  extensionDemo: "extension-demo",
  demoSettings: "demo-settings",
  admin: "admin",
  allItems: "all-items",
  login: "login",
  secureNote: "secure-note",
  creditCard: "credit-card",
  identity: "identity",
  sshKey: "ssh-key",
  emptyState: "empty-state",
  trash: "trash",
  locked: "locked",
} as const

export type PageNameDemo = (typeof pageNameDemo)[keyof typeof pageNameDemo]
