import * as v from "valibot"

export const sendAccessTokenErrorResponseSchema = v.object({
  error: v.string(),
  error_description: v.string(),
  send_access_error_type: v.optional(v.string()),
})

export type SendAccessTokenErrorResponse = v.InferOutput<typeof sendAccessTokenErrorResponseSchema>
