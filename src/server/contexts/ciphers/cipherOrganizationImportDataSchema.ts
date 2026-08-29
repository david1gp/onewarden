import * as v from "valibot"
import { organizationCollectionDataSchema } from "../organizations/organizationCollectionDataSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"

const cipherOrganizationImportRelationSchema = v.object({
  key: v.pipe(v.number(), v.integer(), v.minValue(0)),
  value: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const cipherOrganizationImportDataSchema = v.object({
  ciphers: v.array(cipherDataSchema),
  collections: v.array(organizationCollectionDataSchema),
  collectionRelationships: v.array(cipherOrganizationImportRelationSchema),
})

export type CipherOrganizationImportData = v.InferOutput<typeof cipherOrganizationImportDataSchema>
