import * as v from "valibot"
import type { extensionCipherSchema } from "../crypto/extensionCipherSchema.js"

const extensionBackgroundCipherSummarySchemaData = v.strictObject({
  object: v.literal("cipherMini"),
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.picklist([1, 2, 3, 4, 5]),
  creationDate: v.optional(v.nullable(v.string())),
  revisionDate: v.string(),
  deletedDate: v.nullable(v.string()),
  archivedDate: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  name: v.string(),
  favorite: v.optional(v.boolean()),
  collectionIds: v.optional(v.array(v.string())),
  edit: v.optional(v.boolean()),
  viewPassword: v.optional(v.boolean()),
  permissions: v.optional(
    v.nullable(
      v.strictObject({
        delete: v.optional(v.boolean()),
        restore: v.optional(v.boolean()),
      }),
    ),
  ),
})

export const extensionBackgroundCipherSummarySchema = extensionBackgroundCipherSummarySchemaData

export type ExtensionBackgroundCipherSummary = v.InferOutput<typeof extensionBackgroundCipherSummarySchema>

export type ExtensionBackgroundCipherType =
  v.InferOutput<typeof extensionCipherSchema> extends { type: infer T } ? T : never
