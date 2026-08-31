import * as v from "valibot"

const pageSourceSchema = v.literal("onewarden-webauthn")

export const extensionWebAuthnPageMessageSchema = v.variant("kind", [
  v.strictObject({ source: pageSourceSchema, kind: v.literal("enable") }),
  v.strictObject({ source: pageSourceSchema, kind: v.literal("disable") }),
  v.strictObject({
    source: pageSourceSchema,
    kind: v.literal("request"),
    requestId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(128)),
    operation: v.picklist(["create", "get"]),
    request: v.unknown(),
  }),
  v.strictObject({
    source: pageSourceSchema,
    kind: v.literal("abort"),
    requestId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(128)),
  }),
])

export type ExtensionWebAuthnPageMessage = v.InferOutput<typeof extensionWebAuthnPageMessageSchema>
