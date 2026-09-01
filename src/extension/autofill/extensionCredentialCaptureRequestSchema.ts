import * as v from "valibot"

export const extensionCredentialCaptureRequestSchema = v.strictObject({
  captureId: v.pipe(v.string(), v.minLength(1), v.maxLength(192)),
  url: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
  actionUrl: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
  method: v.picklist(["POST", "PUT", "PATCH"]),
  cause: v.picklist(["submit", "programmaticSubmit", "network"]),
  username: v.nullable(v.pipe(v.string(), v.maxLength(320))),
  password: v.pipe(v.string(), v.minLength(1), v.maxLength(4_096)),
})

export type ExtensionCredentialCaptureRequest = v.InferOutput<typeof extensionCredentialCaptureRequestSchema>
