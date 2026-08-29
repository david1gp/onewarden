import * as v from "valibot"

export const accountEmailChangeTokenRequestSchema = v.object({
  masterPasswordHash: v.string(),
  newEmail: v.pipe(v.string(), v.email()),
  token: v.string(),
})

export type AccountEmailChangeTokenRequest = v.InferOutput<typeof accountEmailChangeTokenRequestSchema>
