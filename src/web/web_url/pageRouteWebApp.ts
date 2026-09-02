import type { pageNameWebApp } from "./pageNameWebApp.js"

export const pageRouteWebApp = {
  root: "/",
  authLogin: "/login",
  authRegister: "/register",
  authVerify: "/verify-email",
  authUnlock: "/unlock",
  authTwoFactorSetup: "/two-factor",
  authTwoFactorChallenge: "/two-factor-challenge",
  ssoConnector: "/sso-connector.html",
  cipherCreate: "/ciphers/new",
  cipherEdit: "/ciphers/:cipherId/edit",
  cipherView: "/ciphers/:cipherId",
  settings: "/settings",
  sends: "/sends",
  sendAccess: "/send/:sendAccessId",
  emergencyAccess: "/emergency-access",
  adminLogin: "/admin-ui/login",
  admin: "/admin-ui",
  organizations: "/organizations",
} as const satisfies Record<keyof typeof pageNameWebApp, string>

export type PageRouteWebApp = keyof typeof pageRouteWebApp
