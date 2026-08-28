import * as v from "valibot"

export const identityDevicePushTokenDataSchema = v.object({ pushToken: v.string() })

export type IdentityDevicePushTokenData = v.InferOutput<typeof identityDevicePushTokenDataSchema>
