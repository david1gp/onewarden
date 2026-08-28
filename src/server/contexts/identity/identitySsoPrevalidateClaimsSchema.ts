import * as v from "valibot"

export const identitySsoPrevalidateClaimsSchema = v.object({
  nbf: v.pipe(v.number(), v.integer()),
  exp: v.pipe(v.number(), v.integer()),
  iss: v.string(),
  sub: v.literal("vaultwarden"),
})

export type IdentitySsoPrevalidateClaims = v.InferOutput<typeof identitySsoPrevalidateClaimsSchema>
