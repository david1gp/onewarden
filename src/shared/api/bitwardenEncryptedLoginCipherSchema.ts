import * as v from "valibot"
import { bitwardenEncryptedLoginCipherFieldSchema } from "./bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "./bitwardenEncryptedLoginSchema.js"

export const bitwardenEncryptedLoginCipherSchema = v.looseObject({
  object: v.picklist(["cipher", "cipherDetails", "cipherMini"]),
  id: v.string(),
  type: v.literal(1),
  creationDate: v.optional(v.string()),
  revisionDate: v.string(),
  deletedDate: v.nullable(v.string()),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  name: v.string(),
  notes: v.nullable(v.string()),
  favorite: v.optional(v.boolean()),
  key: v.optional(v.nullable(v.string())),
  collectionIds: v.optional(v.array(v.string())),
  login: bitwardenEncryptedLoginSchema,
  fields: v.array(bitwardenEncryptedLoginCipherFieldSchema),
})

export type BitwardenEncryptedLoginCipher = v.InferOutput<typeof bitwardenEncryptedLoginCipherSchema>
