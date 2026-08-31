import * as v from "valibot"

export const cipherImportResultSchema = v.strictObject({
  revisionDate: v.string(),
  importedFolderCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  importedCipherCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  warnings: v.array(v.string()),
})

export type CipherImportResult = v.InferOutput<typeof cipherImportResultSchema>
