import * as v from "valibot"

const organizationImportValueSchema = v.record(v.string(), v.unknown())
const organizationImportRelationshipSchema = v.strictObject({
  key: v.pipe(v.number(), v.integer(), v.minValue(0)),
  value: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const organizationImportRequestSchema = v.pipe(
  v.strictObject({
    ciphers: v.array(organizationImportValueSchema),
    collections: v.array(organizationImportValueSchema),
    collectionRelationships: v.array(organizationImportRelationshipSchema),
  }),
  v.check(
    (request) =>
      request.collectionRelationships.every(
        (relationship) => relationship.key < request.ciphers.length && relationship.value < request.collections.length,
      ),
    "Collection relationships must reference existing cipher and collection indexes.",
  ),
)

export type OrganizationImportRequest = v.InferOutput<typeof organizationImportRequestSchema>
