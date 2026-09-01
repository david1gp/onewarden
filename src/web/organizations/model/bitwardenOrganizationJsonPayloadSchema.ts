import * as v from "valibot"
import { bitwardenJsonItemSchema } from "../../settings/model/bitwardenJsonItemSchema.js"

const bitwardenOrganizationCollectionSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.string(),
  organizationId: v.optional(v.nullable(v.string())),
  externalId: v.optional(v.nullable(v.string())),
  object: v.optional(v.literal("collection")),
  type: v.optional(v.literal(0)),
  defaultUserCollectionEmail: v.optional(v.nullable(v.string())),
})

const bitwardenOrganizationJsonItemSchema = v.pipe(
  bitwardenJsonItemSchema,
  v.check(
    (item) =>
      item.folderId === undefined &&
      Array.isArray(item.collectionIds) &&
      item.collectionIds.length > 0 &&
      (item.organizationId === undefined ||
        item.organizationId === null ||
        (typeof item.organizationId === "string" && item.organizationId.length > 0)),
    "Organization items must use collections and must not contain individual folder data.",
  ),
)

export const bitwardenOrganizationJsonPayloadSchema = v.pipe(
  v.strictObject({
    encrypted: v.literal(false),
    collections: v.array(bitwardenOrganizationCollectionSchema),
    items: v.array(bitwardenOrganizationJsonItemSchema),
  }),
  v.check((payload) => {
    const collectionIds = new Set(payload.collections.map((collection) => collection.id))
    if (collectionIds.size !== payload.collections.length) return false
    return payload.items.every((item) => {
      if (item.collectionIds === undefined || item.collectionIds === null) return false
      return (
        new Set(item.collectionIds).size === item.collectionIds.length &&
        item.collectionIds.every((id) => collectionIds.has(id))
      )
    })
  }, "Organization items must reference each collection exactly once and only reference defined collections."),
)

export type BitwardenOrganizationJsonPayload = v.InferOutput<typeof bitwardenOrganizationJsonPayloadSchema>
