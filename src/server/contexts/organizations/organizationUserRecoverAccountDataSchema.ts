import * as v from "valibot"

export const organizationUserRecoverAccountDataSchema = v.object({
  key: v.string(),
  newMasterPasswordHash: v.string(),
  resetMasterPassword: v.optional(v.boolean(), false),
  resetTwoFactor: v.optional(v.boolean(), false),
})

export type OrganizationUserRecoverAccountData = v.InferOutput<typeof organizationUserRecoverAccountDataSchema>
