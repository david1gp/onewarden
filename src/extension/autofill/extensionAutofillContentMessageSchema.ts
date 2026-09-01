import * as v from "valibot"
import { extensionAutofillFieldDescriptorSchema } from "./extensionAutofillFieldDescriptorSchema.js"

const documentIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))

export const extensionAutofillContentMessageSchema = v.variant("type", [
  v.strictObject({
    type: v.literal("autofill.ready"),
    documentId: documentIdSchema,
    revision: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
  v.strictObject({
    type: v.literal("autofill.fieldsChanged"),
    documentId: documentIdSchema,
    revision: v.pipe(v.number(), v.integer(), v.minValue(0)),
    fields: v.pipe(v.array(extensionAutofillFieldDescriptorSchema), v.maxLength(1_000)),
  }),
  v.strictObject({
    type: v.literal("autofill.navigation"),
    documentId: documentIdSchema,
    revision: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
  v.strictObject({
    type: v.literal("autofill.menuDismissed"),
    documentId: documentIdSchema,
    fieldId: v.pipe(v.string(), v.minLength(1), v.maxLength(160)),
    reason: v.picklist(["blur", "escape", "navigation", "removed", "stopped"]),
  }),
])

export type ExtensionAutofillContentMessage = v.InferOutput<typeof extensionAutofillContentMessageSchema>
