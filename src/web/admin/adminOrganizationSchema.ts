import * as v from "valibot"

export const adminOrganizationSchema = v.object({
  id: v.string(),
  uuid: v.string(),
  name: v.string(),
  billingEmail: v.string(),
  status: v.picklist(["active", "disabled"]),
  plan: v.picklist(["free", "premium", "enterprise"]),
  ownerName: v.string(),
  memberCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  cipherCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  attachmentCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  attachmentSizeBytes: v.pipe(v.number(), v.integer(), v.minValue(0)),
  collectionCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  groupCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  eventCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  twoFactorRequired: v.boolean(),
  ssoEnabled: v.boolean(),
  createdAt: v.string(),
})

export type AdminOrganization = v.InferOutput<typeof adminOrganizationSchema>
