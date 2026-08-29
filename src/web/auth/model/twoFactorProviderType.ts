export const twoFactorProviderType = {
  authenticator: 0,
  email: 1,
  duo: 2,
  yubikey: 3,
  u2f: 4,
  remember: 5,
  organizationDuo: 6,
  webauthn: 7,
  recoveryCode: 8,
} as const

export type TwoFactorProviderType = (typeof twoFactorProviderType)[keyof typeof twoFactorProviderType]
