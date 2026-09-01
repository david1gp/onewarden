import * as v from "valibot"

export const extensionCollectionSchema = v.looseObject({
  id: v.pipe(v.string(), v.minLength(1)),
  organizationId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  externalId: v.optional(v.nullable(v.string())),
  type: v.optional(v.number()),
  object: v.optional(v.picklist(["collection", "collectionDetails", "collectionAccessDetails"])),
  assigned: v.optional(v.boolean()),
  hidePasswords: v.optional(v.boolean()),
  manage: v.optional(v.boolean()),
  readOnly: v.optional(v.boolean()),
  unmanaged: v.optional(v.boolean()),
})

export type ExtensionCollection = v.InferOutput<typeof extensionCollectionSchema>
