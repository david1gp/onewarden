import * as v from "valibot"

const extensionWebAuthnBridgeResultSchema = v.union([
  v.strictObject({ success: v.literal(true), data: v.unknown() }),
  v.strictObject({
    success: v.literal(false),
    op: v.string(),
    errorMessage: v.string(),
    code: v.optional(v.string()),
    statusCode: v.optional(v.number()),
  }),
])

export const extensionWebAuthnBridgeResponseSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(128)),
  result: extensionWebAuthnBridgeResultSchema,
  fallbackRequested: v.optional(v.boolean(), false),
})

export type ExtensionWebAuthnBridgeResponse = v.InferOutput<typeof extensionWebAuthnBridgeResponseSchema>
