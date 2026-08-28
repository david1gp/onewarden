import * as v from "valibot"
import { bitwardenEncryptedLoginCipherFieldSchema } from "./bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "./bitwardenEncryptedLoginSchema.js"

export const bitwardenEncryptedLoginCipherCreateRequestSchema = v.looseObject({
  id: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  organizationID: v.optional(v.nullable(v.string())),
  key: v.optional(v.nullable(v.string())),
  type: v.literal(1),
  name: v.string(),
  notes: v.nullable(v.string()),
  fields: v.array(bitwardenEncryptedLoginCipherFieldSchema),
  login: bitwardenEncryptedLoginSchema,
  favorite: v.optional(v.boolean()),
  reprompt: v.optional(v.number()),
  lastKnownRevisionDate: v.optional(v.nullable(v.string())),
  archivedDate: v.optional(v.nullable(v.string())),
})

export type BitwardenEncryptedLoginCipherCreateRequest = v.InferOutput<
  typeof bitwardenEncryptedLoginCipherCreateRequestSchema
>
