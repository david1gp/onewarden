import * as v from "valibot"
import { extensionAutofillFieldKindSchema } from "./extensionAutofillFieldKindSchema.js"

export const extensionAutofillFillValueSchema = v.strictObject({
  kind: extensionAutofillFieldKindSchema,
  value: v.pipe(v.string(), v.maxLength(10_000)),
})

export type ExtensionAutofillFillValue = v.InferOutput<typeof extensionAutofillFillValueSchema>
