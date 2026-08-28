import * as v from "valibot"
import { folderDataSchema } from "../folders/folderDataSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"

const cipherImportRelationSchema = v.object({
  key: v.pipe(v.number(), v.integer(), v.minValue(0)),
  value: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const cipherImportDataSchema = v.object({
  ciphers: v.array(cipherDataSchema),
  folders: v.array(folderDataSchema),
  folderRelationships: v.array(cipherImportRelationSchema),
})

export type CipherImportData = v.InferOutput<typeof cipherImportDataSchema>
