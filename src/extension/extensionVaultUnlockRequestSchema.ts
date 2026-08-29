import * as v from "valibot"
import { bitwardenPasswordTokenResponseSchema } from "../shared/api/bitwardenPasswordTokenResponseSchema.js"
import { bitwardenPreloginResponseSchema } from "../shared/api/bitwardenPreloginResponseSchema.js"
import { extensionEmailSchema } from "./extensionEmailSchema.js"
import { extensionPasswordSchema } from "./extensionPasswordSchema.js"

export const extensionVaultUnlockRequestSchema = v.object({
  email: extensionEmailSchema,
  password: extensionPasswordSchema,
  prelogin: v.optional(bitwardenPreloginResponseSchema),
  token: bitwardenPasswordTokenResponseSchema,
})
