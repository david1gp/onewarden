import * as v from "valibot"
import { extensionAutofillFieldKindSchema } from "./extensionAutofillFieldKindSchema.js"

export const extensionAutofillFieldDescriptorSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(160)),
  kind: extensionAutofillFieldKindSchema,
  control: v.picklist(["input", "select", "textarea", "contenteditable"]),
})

export type ExtensionAutofillFieldDescriptor = v.InferOutput<typeof extensionAutofillFieldDescriptorSchema>
