import * as v from "valibot"
import { bitwardenTokenRequestSchema } from "./bitwardenTokenRequestSchema.js"

export const bitwardenPasswordTokenRequestSchema = v.pipe(
  bitwardenTokenRequestSchema,
  v.check(
    (input) =>
      (input.grant_type === "password" || input.granttype === "password") &&
      (input.client_id !== undefined || input.clientid !== undefined) &&
      input.password !== undefined &&
      input.scope !== undefined &&
      input.username !== undefined &&
      (input.device_identifier !== undefined || input.deviceidentifier !== undefined) &&
      (input.device_name !== undefined || input.devicename !== undefined) &&
      (input.device_type !== undefined || input.devicetype !== undefined),
    "A password token request is incomplete.",
  ),
)

export type BitwardenPasswordTokenRequest = v.InferOutput<typeof bitwardenPasswordTokenRequestSchema>
