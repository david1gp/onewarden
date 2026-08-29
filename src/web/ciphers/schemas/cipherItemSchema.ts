import * as v from "valibot"
import { cipherAttachmentSchema } from "./cipherAttachmentSchema.js"
import { cipherCardDataSchema } from "./cipherCardDataSchema.js"
import { cipherCustomFieldSchema } from "./cipherCustomFieldSchema.js"
import { cipherIdentityDataSchema } from "./cipherIdentityDataSchema.js"
import { cipherLoginDataSchema } from "./cipherLoginDataSchema.js"
import { cipherPasswordHistoryEntrySchema } from "./cipherPasswordHistoryEntrySchema.js"
import { cipherSecureNoteDataSchema } from "./cipherSecureNoteDataSchema.js"
import { cipherTypeSchema } from "./cipherTypeSchema.js"

export const cipherItemSchema = v.object({
  id: v.string(),
  type: cipherTypeSchema,
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  favorite: v.boolean(),
  folderId: v.optional(v.nullable(v.string())),
  folderName: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  collectionIds: v.optional(v.nullable(v.array(v.string()))),
  reprompt: v.optional(v.nullable(v.number())),
  fields: v.array(cipherCustomFieldSchema),
  attachments: v.optional(v.nullable(v.array(cipherAttachmentSchema))),
  passwordHistory: v.optional(v.nullable(v.array(cipherPasswordHistoryEntrySchema))),
  login: v.optional(v.nullable(cipherLoginDataSchema)),
  secureNote: v.optional(v.nullable(cipherSecureNoteDataSchema)),
  card: v.optional(v.nullable(cipherCardDataSchema)),
  identity: v.optional(v.nullable(cipherIdentityDataSchema)),
  creationDate: v.optional(v.nullable(v.string())),
  revisionDate: v.optional(v.nullable(v.string())),
  deletedDate: v.optional(v.nullable(v.string())),
  archivedDate: v.optional(v.nullable(v.string())),
  viewPassword: v.optional(v.nullable(v.boolean())),
  edit: v.optional(v.nullable(v.boolean())),
  permissions: v.optional(
    v.nullable(
      v.object({
        delete: v.optional(v.nullable(v.boolean())),
        restore: v.optional(v.nullable(v.boolean())),
      }),
    ),
  ),
  passwordStrength: v.optional(v.nullable(v.string())),
})

export type CipherItem = v.InferOutput<typeof cipherItemSchema>
