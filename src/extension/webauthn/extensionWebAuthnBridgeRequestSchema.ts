import * as v from "valibot"

const base64UrlSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.maxLength(131_072))
const credentialIdSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(256))
const userVerificationSchema = v.picklist(["required", "preferred", "discouraged"])
const timeoutSchema = v.pipe(v.number(), v.finite(), v.integer(), v.minValue(1), v.maxValue(120_000))

const extensionWebAuthnBridgeCreateRequestSchema = v.strictObject({
  challenge: v.pipe(base64UrlSchema, v.minLength(1)),
  rpId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(253))), null),
  rpName: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(256))), null),
  userId: v.pipe(base64UrlSchema, v.minLength(1), v.maxLength(128)),
  userName: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(256))), null),
  userDisplayName: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(256))), null),
  requireResidentKey: v.optional(v.boolean(), false),
  residentKey: v.optional(v.picklist(["discouraged", "preferred", "required"]), "discouraged"),
  userVerification: v.optional(userVerificationSchema, "discouraged"),
  excludeCredentialIds: v.optional(v.pipe(v.array(credentialIdSchema), v.maxLength(64)), []),
  pubKeyCredParams: v.pipe(
    v.array(v.strictObject({ type: v.literal("public-key"), alg: v.pipe(v.number(), v.finite(), v.integer()) })),
    v.minLength(1),
    v.maxLength(64),
  ),
  timeout: timeoutSchema,
  nativeFallbackSupported: v.boolean(),
})

const extensionWebAuthnBridgeGetRequestSchema = v.strictObject({
  challenge: v.pipe(base64UrlSchema, v.minLength(1)),
  rpId: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(253))), null),
  allowCredentialIds: v.optional(v.pipe(v.array(credentialIdSchema), v.maxLength(64)), []),
  userVerification: v.optional(userVerificationSchema, "discouraged"),
  mediation: v.optional(v.picklist(["optional", "required", "silent", "conditional"]), "optional"),
  timeout: timeoutSchema,
  nativeFallbackSupported: v.boolean(),
})

export const extensionWebAuthnBridgeRequestSchema = v.variant("type", [
  v.strictObject({
    type: v.literal("webauthnBridgeRequest"),
    requestId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(128)),
    operation: v.literal("create"),
    request: extensionWebAuthnBridgeCreateRequestSchema,
  }),
  v.strictObject({
    type: v.literal("webauthnBridgeRequest"),
    requestId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(128)),
    operation: v.literal("get"),
    request: extensionWebAuthnBridgeGetRequestSchema,
  }),
  v.strictObject({
    type: v.literal("webauthnBridgeAbort"),
    requestId: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u), v.minLength(1), v.maxLength(128)),
  }),
])

export type ExtensionWebAuthnBridgeRequest = v.InferOutput<typeof extensionWebAuthnBridgeRequestSchema>
