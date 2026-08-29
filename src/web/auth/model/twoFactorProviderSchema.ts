import * as v from "valibot"

export const twoFactorProviderSchema = v.object({
  data: v.array(
    v.object({
      enabled: v.boolean(),
      type: v.number(),
      object: v.literal("twoFactorProvider"),
    }),
  ),
  object: v.literal("list"),
  continuationToken: v.nullable(v.unknown()),
})

export type TwoFactorProviderList = v.InferOutput<typeof twoFactorProviderSchema>
