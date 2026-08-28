import * as v from "valibot"

const extensionLoginFillFrameIdSchema = v.pipe(v.number(), v.integer(), v.minValue(0))

export const extensionLoginFillRequestSchema = v.strictObject({
  loginId: v.pipe(v.string(), v.trim(), v.minLength(1)),
  frameId: v.optional(extensionLoginFillFrameIdSchema),
})

export type ExtensionLoginFillRequest = v.InferOutput<typeof extensionLoginFillRequestSchema>
