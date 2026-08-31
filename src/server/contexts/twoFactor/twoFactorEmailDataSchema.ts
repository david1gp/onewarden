import * as v from "valibot"

const twoFactorEmailSafeIntegerSchema = v.pipe(v.number(), v.safeInteger())

export const twoFactorEmailDataSchema = v.looseObject({
  attempts: v.pipe(twoFactorEmailSafeIntegerSchema, v.minValue(0)),
  email: v.string(),
  last_token: v.nullable(v.string()),
  token_sent: twoFactorEmailSafeIntegerSchema,
})

export type TwoFactorEmailData = v.InferOutput<typeof twoFactorEmailDataSchema>
