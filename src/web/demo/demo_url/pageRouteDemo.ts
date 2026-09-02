import type { pageNameDemo } from "./pageNameDemo.js"

export const pageRouteDemo = {
  directory: "/demo",
  extensionDemo: "/demo/extension",
  demoSettings: "/demo/settings",
  admin: "/demo/admin",
  allItems: "/demo/all-items",
  login: "/demo/login",
  secureNote: "/demo/secure-note",
  creditCard: "/demo/credit-card",
  identity: "/demo/identity",
  sshKey: "/demo/ssh-key",
  emptyState: "/demo/empty-state",
  trash: "/demo/trash",
  locked: "/demo/locked",
} as const satisfies Record<keyof typeof pageNameDemo, string>

export type PageRouteDemo = keyof typeof pageRouteDemo
