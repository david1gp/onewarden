import * as v from "valibot"

const identityTokenOptionalStringSchema = v.optional(v.string())

export const identityTokenRequestSchema = v.object({
  grantType: v.optional(v.string(), ""),
  refreshToken: identityTokenOptionalStringSchema,
  clientId: identityTokenOptionalStringSchema,
  clientSecret: identityTokenOptionalStringSchema,
  password: identityTokenOptionalStringSchema,
  scope: identityTokenOptionalStringSchema,
  username: identityTokenOptionalStringSchema,
  deviceIdentifier: identityTokenOptionalStringSchema,
  deviceName: identityTokenOptionalStringSchema,
  deviceType: identityTokenOptionalStringSchema,
  devicePushToken: identityTokenOptionalStringSchema,
  twoFactorProvider: identityTokenOptionalStringSchema,
  twoFactorToken: identityTokenOptionalStringSchema,
  twoFactorRemember: identityTokenOptionalStringSchema,
  authRequest: identityTokenOptionalStringSchema,
  code: identityTokenOptionalStringSchema,
  codeVerifier: identityTokenOptionalStringSchema,
  sendId: identityTokenOptionalStringSchema,
  passwordHashB64: identityTokenOptionalStringSchema,
  email: identityTokenOptionalStringSchema,
  otp: identityTokenOptionalStringSchema,
})

export type IdentityTokenRequest = v.InferOutput<typeof identityTokenRequestSchema>
