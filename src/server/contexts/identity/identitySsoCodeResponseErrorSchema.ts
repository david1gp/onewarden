import * as v from "valibot"

export const identitySsoCodeResponseErrorSchema = v.object({
  error: v.string(),
  error_description: v.nullable(v.string()),
})

export type IdentitySsoCodeResponseError = v.InferOutput<typeof identitySsoCodeResponseErrorSchema>
