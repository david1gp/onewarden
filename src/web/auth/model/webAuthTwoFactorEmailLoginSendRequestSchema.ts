import * as v from "valibot"

export const webAuthTwoFactorEmailLoginSendRequestSchema = v.object({
  email: v.optional(v.string()),
  deviceIdentifier: v.optional(v.string()),
  masterPasswordHash: v.optional(v.string()),
})

export type WebAuthTwoFactorEmailLoginSendRequest = v.InferOutput<typeof webAuthTwoFactorEmailLoginSendRequestSchema>
export type WebAuthTwoFactorEmailLoginSendRequestInput = v.InferInput<
  typeof webAuthTwoFactorEmailLoginSendRequestSchema
>
