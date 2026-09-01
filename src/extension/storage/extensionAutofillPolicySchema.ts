import * as v from "valibot"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionAutofillPolicyDataSchema = v.strictObject({
  pageLoadEnabled: v.boolean(),
  disabledSites: v.pipe(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(253))), v.maxLength(500)),
})

export const extensionAutofillPolicySchema = v.intersect([
  extensionAutofillPolicyDataSchema,
  v.strictObject({ schemaVersion: v.literal(extensionStorageSchemaVersion) }),
])

export type ExtensionAutofillPolicy = v.InferOutput<typeof extensionAutofillPolicyDataSchema>
