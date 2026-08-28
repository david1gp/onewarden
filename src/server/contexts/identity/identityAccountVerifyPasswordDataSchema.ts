import * as v from "valibot"

export const identityAccountVerifyPasswordDataSchema = v.object({ masterPasswordHash: v.string() })

export type IdentityAccountVerifyPasswordData = v.InferOutput<typeof identityAccountVerifyPasswordDataSchema>
