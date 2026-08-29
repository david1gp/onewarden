import * as v from "valibot"

export const accountProfileSchema = v.object({
  id: v.string(),
  name: v.nullable(v.string()),
  email: v.string(),
  emailVerified: v.boolean(),
  masterPasswordHint: v.nullable(v.string()),
  premium: v.boolean(),
  culture: v.string(),
  twoFactorEnabled: v.boolean(),
  key: v.nullable(v.string()),
  privateKey: v.nullable(v.string()),
  securityStamp: v.nullable(v.string()),
  avatarColor: v.nullable(v.string()),
  forcePasswordReset: v.boolean(),
  usesKeyConnector: v.boolean(),
  object: v.literal("profile"),
})

export type AccountProfile = v.InferOutput<typeof accountProfileSchema>
