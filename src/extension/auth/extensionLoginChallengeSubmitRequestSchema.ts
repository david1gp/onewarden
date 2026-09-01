import * as v from "valibot"

export const extensionLoginChallengeSubmitRequestSchema = v.strictObject({
  challengeId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  provider: v.picklist([0, 1, 7, 8]),
  token: v.pipe(v.string(), v.minLength(1), v.maxLength(131_072)),
  rememberDevice: v.optional(v.boolean(), false),
})

export type ExtensionLoginChallengeSubmitRequest = v.InferOutput<typeof extensionLoginChallengeSubmitRequestSchema>
