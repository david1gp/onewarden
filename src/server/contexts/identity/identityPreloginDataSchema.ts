import * as v from "valibot"

export const identityPreloginDataSchema = v.object({ email: v.string() })

export type IdentityPreloginData = v.InferOutput<typeof identityPreloginDataSchema>
