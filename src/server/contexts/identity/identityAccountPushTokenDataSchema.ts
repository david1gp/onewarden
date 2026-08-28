import * as v from "valibot"

export const identityAccountPushTokenDataSchema = v.object({ pushToken: v.string() })

export type IdentityAccountPushTokenData = v.InferOutput<typeof identityAccountPushTokenDataSchema>
