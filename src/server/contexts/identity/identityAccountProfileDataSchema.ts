import * as v from "valibot"

export const identityAccountProfileDataSchema = v.object({ name: v.string() })

export type IdentityAccountProfileData = v.InferOutput<typeof identityAccountProfileDataSchema>
