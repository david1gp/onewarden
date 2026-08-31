import * as v from "valibot"

export const webAuthLoginRequestSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.toLowerCase()),
  passwordHashB64: v.string(),
  clientId: v.optional(v.string(), "web"),
  deviceName: v.optional(v.string(), "Web Browser"),
  deviceType: v.optional(v.string(), "6"),
  deviceIdentifier: v.optional(v.string(), "web-browser"),
  twoFactorProvider: v.optional(v.pipe(v.union([v.string(), v.number()]), v.transform(String))),
  twoFactorToken: v.optional(v.string()),
  twoFactorRemember: v.optional(v.union([v.literal("1"), v.literal("0")])),
})

export type WebAuthLoginRequest = v.InferOutput<typeof webAuthLoginRequestSchema>
export type WebAuthLoginRequestInput = v.InferInput<typeof webAuthLoginRequestSchema>
