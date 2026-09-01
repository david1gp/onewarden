import * as v from "valibot"

export const extensionLoginChallengeIdRequestSchema = v.strictObject({
  challengeId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionLoginChallengeIdRequest = v.InferOutput<typeof extensionLoginChallengeIdRequestSchema>
