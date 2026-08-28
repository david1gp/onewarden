import * as v from "valibot"
import { identitySsoAuthenticatedUserSchema } from "./identitySsoAuthenticatedUserSchema.js"
import { identitySsoCodeResponseErrorSchema } from "./identitySsoCodeResponseErrorSchema.js"

export const identitySsoAuthSchema = v.object({
  state: v.string(),
  client_challenge: v.string(),
  nonce: v.string(),
  redirect_uri: v.string(),
  code_response: v.nullable(v.string()),
  code_response_error: v.nullable(identitySsoCodeResponseErrorSchema),
  auth_response: v.nullable(identitySsoAuthenticatedUserSchema),
  created_at: v.string(),
  updated_at: v.string(),
  binding_hash: v.nullable(v.string()),
})

export type IdentitySsoAuthSchemaValue = v.InferOutput<typeof identitySsoAuthSchema>
