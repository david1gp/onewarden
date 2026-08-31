import * as v from "valibot"

export const webAuthTwoFactorYubikeyActivatePayloadSchema = v.object({
  key1: v.optional(v.nullable(v.string())),
  key2: v.optional(v.nullable(v.string())),
  key3: v.optional(v.nullable(v.string())),
  key4: v.optional(v.nullable(v.string())),
  key5: v.optional(v.nullable(v.string())),
  nfc: v.optional(v.boolean()),
})

export type WebAuthTwoFactorYubikeyActivatePayload = v.InferOutput<typeof webAuthTwoFactorYubikeyActivatePayloadSchema>
