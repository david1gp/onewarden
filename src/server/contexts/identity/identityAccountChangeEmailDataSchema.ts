import * as v from "valibot"

const identityAccountChangeEmailTokenSchema = v.union([v.pipe(v.number(), v.integer()), v.string()])

export const identityAccountChangeEmailDataSchema = v.object({
  masterPasswordHash: v.string(),
  newEmail: v.string(),
  key: v.string(),
  newMasterPasswordHash: v.string(),
  token: identityAccountChangeEmailTokenSchema,
})

export type IdentityAccountChangeEmailData = v.InferOutput<typeof identityAccountChangeEmailDataSchema>
