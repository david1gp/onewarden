import * as v from "valibot"
import { folderDataSchema } from "../folders/folderDataSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"

const cipherImportIdSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(256),
  v.regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
)

const cipherImportRelationSchema = v.strictObject({
  key: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
  value: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
})

const cipherImportFolderDataSchema = v.strictObject({
  ...folderDataSchema.entries,
  id: v.optional(v.nullable(cipherImportIdSchema)),
})

const cipherImportCipherDataSchema = v.strictObject({
  ...cipherDataSchema.entries,
  id: v.optional(v.nullable(cipherImportIdSchema)),
  folderId: v.optional(v.nullable(cipherImportIdSchema)),
  organizationId: v.optional(v.nullable(cipherImportIdSchema)),
  organizationID: v.optional(v.nullable(cipherImportIdSchema)),
  type: v.picklist([1, 2, 3, 4]),
  reprompt: v.optional(v.nullable(v.picklist([0, 1]))),
})

export const cipherImportDataSchema = v.strictObject({
  ciphers: v.array(cipherImportCipherDataSchema),
  folders: v.array(cipherImportFolderDataSchema),
  folderRelationships: v.array(cipherImportRelationSchema),
})

export type CipherImportData = v.InferOutput<typeof cipherImportDataSchema>
