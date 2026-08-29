import * as v from "valibot"
import { twoFactorWebAuthnKeySchema } from "./twoFactorWebAuthnKeySchema.js"

export const twoFactorWebAuthnResponseSchema = v.object({
  enabled: v.boolean(),
  keys: v.array(twoFactorWebAuthnKeySchema),
  object: v.literal("twoFactorU2f"),
})

export type TwoFactorWebAuthnResponse = v.InferOutput<typeof twoFactorWebAuthnResponseSchema>
