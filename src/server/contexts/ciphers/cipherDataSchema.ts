import * as v from "valibot"

const cipherDataValueSchema = v.optional(v.unknown())

export const cipherDataSchema = v.object({
  id: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  organizationID: v.optional(v.nullable(v.string())),
  key: v.optional(v.nullable(v.string())),
  type: v.number(),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  fields: cipherDataValueSchema,
  login: cipherDataValueSchema,
  secureNote: cipherDataValueSchema,
  card: cipherDataValueSchema,
  identity: cipherDataValueSchema,
  sshKey: cipherDataValueSchema,
  favorite: v.optional(v.nullable(v.boolean())),
  reprompt: v.optional(v.nullable(v.number())),
  passwordHistory: cipherDataValueSchema,
  attachments: cipherDataValueSchema,
  attachments2: cipherDataValueSchema,
  lastKnownRevisionDate: v.optional(v.nullable(v.string())),
  archivedDate: v.optional(v.nullable(v.string())),
})

export type CipherData = v.InferOutput<typeof cipherDataSchema>
