import * as v from "valibot"

const twoFactorDuoDataStringSchema = v.pipe(
  v.string(),
  v.check((value) => value.trim() !== ""),
)

export const twoFactorDuoDataSchema = v.looseObject({
  host: twoFactorDuoDataStringSchema,
  ik: twoFactorDuoDataStringSchema,
  sk: twoFactorDuoDataStringSchema,
})

export type TwoFactorDuoData = v.InferOutput<typeof twoFactorDuoDataSchema>
