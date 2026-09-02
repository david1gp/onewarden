export const pageNameWebApp = {
  root: "root",
  authLogin: "auth-login",
  authRegister: "auth-register",
  authVerify: "auth-verify",
  authUnlock: "auth-unlock",
  authTwoFactorSetup: "auth-two-factor-setup",
  authTwoFactorChallenge: "auth-two-factor-challenge",
  ssoConnector: "sso-connector",
  cipherCreate: "cipher-create",
  cipherEdit: "cipher-edit",
  cipherView: "cipher-view",
  settings: "settings",
  sends: "sends",
  sendAccess: "send-access",
  emergencyAccess: "emergency-access",
  adminLogin: "admin-login",
  admin: "admin",
  organizations: "organizations",
} as const

export type PageNameWebApp = (typeof pageNameWebApp)[keyof typeof pageNameWebApp]
