import * as v from "valibot"
import { bitwardenTokenRequestSchema } from "./bitwardenTokenRequestSchema.js"

export const bitwardenRefreshTokenRequestSchema = v.pipe(
  bitwardenTokenRequestSchema,
  v.check(
    (input) =>
      (input.grant_type === "refresh_token" || input.granttype === "refresh_token") &&
      (input.refresh_token !== undefined || input.refreshtoken !== undefined),
    "A refresh token request is incomplete.",
  ),
)

export type BitwardenRefreshTokenRequest = v.InferOutput<typeof bitwardenRefreshTokenRequestSchema>
