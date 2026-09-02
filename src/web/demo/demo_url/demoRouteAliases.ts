import type { PageNameDemo } from "./pageNameDemo.js"
import { pageNameDemo } from "./pageNameDemo.js"
import { pageRouteDemo } from "./pageRouteDemo.js"

type DemoRouteAlias = Readonly<{
  readonly pageName: PageNameDemoAlias
  readonly paths: readonly string[]
}>
type PageNameDemoAlias = PageNameDemo | "organizations"

export const demoRouteAliases: readonly DemoRouteAlias[] = [
  { pageName: pageNameDemo.directory, paths: [pageRouteDemo.directory] },
  { pageName: pageNameDemo.extensionDemo, paths: [pageRouteDemo.extensionDemo] },
  {
    pageName: pageNameDemo.demoSettings,
    paths: [
      pageRouteDemo.demoSettings,
      "/demo/settings/account",
      "/demo/settings/profile",
      "/demo/settings/security",
      "/demo/settings/two-factor",
      "/demo/settings/2fa",
      "/demo/settings/two-factor-setup",
      "/demo/settings/email",
      "/demo/settings/devices",
      "/demo/settings/sessions",
      "/demo/settings/emergency",
      "/demo/settings/tools",
      "/demo/settings/import",
      "/demo/settings/export",
      "/demo/settings/appearance",
      "/demo/settings/theme",
      "/demo/settings/danger",
      "/demo/settings/delete-account",
    ],
  },
  { pageName: pageNameDemo.admin, paths: [pageRouteDemo.admin, "/demo/admin/login"] },
  { pageName: pageNameDemo.allItems, paths: ["/demo/all", pageRouteDemo.allItems, "/demo/vault"] },
  { pageName: pageNameDemo.login, paths: [pageRouteDemo.login, "/demo/selected-login"] },
  {
    pageName: pageNameDemo.secureNote,
    paths: [pageRouteDemo.secureNote, "/demo/selected-secure-note", "/demo/note"],
  },
  {
    pageName: pageNameDemo.creditCard,
    paths: [pageRouteDemo.creditCard, "/demo/selected-credit-card", "/demo/card"],
  },
  { pageName: pageNameDemo.identity, paths: [pageRouteDemo.identity, "/demo/selected-identity"] },
  { pageName: pageNameDemo.sshKey, paths: [pageRouteDemo.sshKey, "/demo/selected-ssh-key"] },
  { pageName: pageNameDemo.emptyState, paths: ["/demo/empty", pageRouteDemo.emptyState] },
  { pageName: pageNameDemo.trash, paths: [pageRouteDemo.trash, "/demo/deleted"] },
  { pageName: pageNameDemo.locked, paths: [pageRouteDemo.locked, "/demo/lock"] },
  { pageName: "organizations", paths: ["/demo/organizations", "/demo/organization", "/demo/org"] },
] as const
