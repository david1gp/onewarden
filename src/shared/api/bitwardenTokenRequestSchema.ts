import * as v from "valibot"

export const bitwardenTokenRequestSchema = v.looseObject({
  grant_type: v.optional(v.string()),
  granttype: v.optional(v.string()),
  refresh_token: v.optional(v.string()),
  refreshtoken: v.optional(v.string()),
  client_id: v.optional(v.string()),
  clientid: v.optional(v.string()),
  client_secret: v.optional(v.string()),
  clientsecret: v.optional(v.string()),
  password: v.optional(v.string()),
  scope: v.optional(v.string()),
  username: v.optional(v.string()),
  device_identifier: v.optional(v.string()),
  deviceidentifier: v.optional(v.string()),
  device_name: v.optional(v.string()),
  devicename: v.optional(v.string()),
  device_type: v.optional(v.string()),
  devicetype: v.optional(v.string()),
  device_push_token: v.optional(v.string()),
  devicepushtoken: v.optional(v.string()),
  two_factor_provider: v.optional(v.string()),
  twofactorprovider: v.optional(v.string()),
  two_factor_token: v.optional(v.string()),
  twofactortoken: v.optional(v.string()),
  two_factor_remember: v.optional(v.string()),
  twofactorremember: v.optional(v.string()),
  authrequest: v.optional(v.string()),
})

export type BitwardenTokenRequest = v.InferOutput<typeof bitwardenTokenRequestSchema>
