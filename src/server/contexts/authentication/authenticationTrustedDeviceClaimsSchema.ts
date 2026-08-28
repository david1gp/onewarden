import * as v from "valibot"

export const authenticationTrustedDeviceClaimsSchema = v.object({
  exp: v.pipe(v.number(), v.integer()),
  iss: v.string(),
  nbf: v.pipe(v.number(), v.integer()),
  sub: v.string(),
  user_uuid: v.string(),
})

export type AuthenticationTrustedDeviceClaims = v.InferOutput<typeof authenticationTrustedDeviceClaimsSchema>
