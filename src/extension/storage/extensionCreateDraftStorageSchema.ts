import * as v from "valibot"
import { extensionEncryptedPayloadSchema } from "./extensionEncryptedPayloadSchema.js"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionCreateDraftDataSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  updatedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  payload: extensionEncryptedPayloadSchema,
})

export const extensionCreateDraftStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  drafts: v.array(extensionCreateDraftDataSchema),
})

export type ExtensionCreateDraft = v.InferOutput<typeof extensionCreateDraftDataSchema>
