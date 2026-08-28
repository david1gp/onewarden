import * as v from "valibot"

const nullableStringSchema = v.nullable(v.string())

const extensionPersonalLoginCipherUriSchema = v.looseObject({
  uri: nullableStringSchema,
  match: v.nullish(v.number()),
})

const extensionPersonalLoginCipherLoginSchema = v.looseObject({
  username: nullableStringSchema,
  password: nullableStringSchema,
  uris: v.array(extensionPersonalLoginCipherUriSchema),
  uri: v.optional(nullableStringSchema),
  totp: nullableStringSchema,
})

const extensionPersonalLoginCipherFieldSchema = v.looseObject({
  name: nullableStringSchema,
  value: nullableStringSchema,
  type: v.number(),
  linkedId: v.nullable(v.number()),
})

export const extensionPersonalLoginCipherSchema = v.looseObject({
  object: v.picklist(["cipher", "cipherDetails", "cipherMini"]),
  id: v.string(),
  type: v.literal(1),
  creationDate: v.optional(v.string()),
  revisionDate: v.string(),
  deletedDate: nullableStringSchema,
  organizationId: v.optional(nullableStringSchema),
  folderId: v.optional(nullableStringSchema),
  name: v.string(),
  notes: nullableStringSchema,
  favorite: v.optional(v.boolean()),
  key: v.optional(nullableStringSchema),
  collectionIds: v.optional(v.array(v.string())),
  login: extensionPersonalLoginCipherLoginSchema,
  fields: v.array(extensionPersonalLoginCipherFieldSchema),
})

export type ExtensionPersonalLoginCipher = v.InferOutput<typeof extensionPersonalLoginCipherSchema>
