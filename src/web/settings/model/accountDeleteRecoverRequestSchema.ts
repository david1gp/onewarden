import * as v from "valibot"

export const accountDeleteRecoverRequestSchema = v.object({
  email: v.pipe(v.string(), v.email()),
})

export type AccountDeleteRecoverRequest = v.InferOutput<typeof accountDeleteRecoverRequestSchema>
