import * as v from "valibot"

const twoFactorProtectedActionSafeIntegerSchema = v.pipe(v.number(), v.safeInteger())

export const twoFactorProtectedActionDataSchema = v.looseObject({
  attempts: v.pipe(twoFactorProtectedActionSafeIntegerSchema, v.minValue(0)),
  token: v.string(),
  token_sent: twoFactorProtectedActionSafeIntegerSchema,
})

export type TwoFactorProtectedActionData = v.InferOutput<typeof twoFactorProtectedActionDataSchema>
