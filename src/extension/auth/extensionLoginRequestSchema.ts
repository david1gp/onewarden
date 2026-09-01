import * as v from "valibot"
import { extensionEmailSchema } from "../extensionEmailSchema.js"
import { extensionPasswordSchema } from "../extensionPasswordSchema.js"

export const extensionLoginRequestSchema = v.strictObject({
  email: extensionEmailSchema,
  password: extensionPasswordSchema,
  clientId: v.optional(v.pipe(v.string(), v.minLength(1)), "browser"),
  scope: v.optional(v.pipe(v.string(), v.minLength(1)), "api offline_access"),
  deviceIdentifier: v.optional(v.pipe(v.string(), v.minLength(1)), "onewarden-extension"),
  deviceName: v.optional(v.pipe(v.string(), v.minLength(1)), "OneWarden"),
  deviceType: v.optional(v.pipe(v.string(), v.minLength(1)), "14"),
})

export type ExtensionLoginRequest = v.InferOutput<typeof extensionLoginRequestSchema>
