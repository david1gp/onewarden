import * as v from "valibot"

const documentIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))

export const extensionAutofillBackgroundMessageSchema = v.variant("type", [
  v.strictObject({ type: v.literal("autofill.start"), documentId: documentIdSchema }),
  v.strictObject({
    type: v.literal("autofill.stop"),
    documentId: documentIdSchema,
    reason: v.picklist(["background", "locked", "logout", "accountChanged"]),
  }),
  v.strictObject({ type: v.literal("autofill.scanNow"), documentId: documentIdSchema }),
])

export type ExtensionAutofillBackgroundMessage = v.InferOutput<typeof extensionAutofillBackgroundMessageSchema>
