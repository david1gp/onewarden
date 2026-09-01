import * as v from "valibot"

const extensionVaultCipherTypeSchema = v.picklist([1, 2, 3, 4, 5])
const extensionVaultResourceIdSchema = v.optional(v.nullable(v.pipe(v.string(), v.minLength(1))))

export const extensionVaultSearchRequestSchema = v.strictObject({
  query: v.optional(v.pipe(v.string(), v.maxLength(200)), ""),
  type: v.optional(extensionVaultCipherTypeSchema),
  folderId: extensionVaultResourceIdSchema,
  collectionId: extensionVaultResourceIdSchema,
  organizationId: extensionVaultResourceIdSchema,
  favorite: v.optional(v.boolean()),
  includeDeleted: v.optional(v.boolean(), false),
  includeArchived: v.optional(v.boolean(), false),
})

export type ExtensionVaultSearchRequest = v.InferOutput<typeof extensionVaultSearchRequestSchema>
