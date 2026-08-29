import * as v from "valibot"

const organizationCreateKeysSchema = v.object({
  encryptedPrivateKey: v.string(),
  publicKey: v.string(),
})

export const organizationCreateDataSchema = v.object({
  billingEmail: v.string(),
  collectionName: v.string(),
  key: v.string(),
  keys: v.nullish(organizationCreateKeysSchema),
  name: v.string(),
  planType: v.union([v.pipe(v.number(), v.integer()), v.string()]),
})

export type OrganizationCreateData = v.InferOutput<typeof organizationCreateDataSchema>
