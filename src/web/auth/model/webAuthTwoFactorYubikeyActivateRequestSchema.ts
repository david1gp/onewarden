import * as v from "valibot"

export const webAuthTwoFactorYubikeyActivateRequestSchema = v.object({
  key1: v.optional(v.nullable(v.string())),
  key2: v.optional(v.nullable(v.string())),
  key3: v.optional(v.nullable(v.string())),
  key4: v.optional(v.nullable(v.string())),
  key5: v.optional(v.nullable(v.string())),
  nfc: v.optional(v.boolean(), false),
  masterPasswordHash: v.optional(v.nullable(v.string()), null),
})

export type WebAuthTwoFactorYubikeyActivateRequest = v.InferOutput<typeof webAuthTwoFactorYubikeyActivateRequestSchema>
export type WebAuthTwoFactorYubikeyActivateRequestInput = v.InferInput<
  typeof webAuthTwoFactorYubikeyActivateRequestSchema
>
