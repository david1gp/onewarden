import * as v from "valibot"
import { extensionEmailSchema } from "../extensionEmailSchema.js"
import { extensionPasswordSchema } from "../extensionPasswordSchema.js"

export const extensionUnlockRequestSchema = v.strictObject({
  email: v.optional(extensionEmailSchema),
  password: extensionPasswordSchema,
})

export type ExtensionUnlockRequest = v.InferOutput<typeof extensionUnlockRequestSchema>
