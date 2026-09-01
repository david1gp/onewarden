import * as v from "valibot"

export const extensionCredentialCapturePromptSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(192)),
  kind: v.picklist(["add", "change", "atRisk"]),
  site: v.pipe(v.string(), v.minLength(1), v.maxLength(253)),
  risk: v.nullable(v.picklist(["insecure", "crossOrigin", "readOnly", "ambiguous"])),
})

export type ExtensionCredentialCapturePrompt = v.InferOutput<typeof extensionCredentialCapturePromptSchema>
