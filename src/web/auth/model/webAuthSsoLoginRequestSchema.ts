import * as v from "valibot"

export const webAuthSsoLoginRequestSchema = v.object({
  code: v.pipe(v.string(), v.trim(), v.minLength(1)),
  codeVerifier: v.pipe(v.string(), v.trim(), v.minLength(43), v.maxLength(128), v.regex(/^[A-Za-z0-9_-]+$/u)),
  clientId: v.optional(v.literal("web"), "web"),
  deviceName: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1)), "Web Browser"),
  deviceType: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1)), "6"),
  deviceIdentifier: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1)), "web-browser"),
})

export type WebAuthSsoLoginRequest = v.InferOutput<typeof webAuthSsoLoginRequestSchema>
export type WebAuthSsoLoginRequestInput = v.InferInput<typeof webAuthSsoLoginRequestSchema>
