import * as v from "valibot"

const twoFactorYubikeyDataShapeSchema = v.looseObject({
  Keys: v.optional(v.nullable(v.array(v.string()))),
  Nfc: v.optional(v.nullable(v.boolean())),
  keys: v.optional(v.nullable(v.array(v.string()))),
  nfc: v.optional(v.nullable(v.boolean())),
})

export const twoFactorYubikeyDataSchema = v.pipe(
  twoFactorYubikeyDataShapeSchema,
  v.check((value) => {
    const keys = value.keys ?? value.Keys
    const nfc = value.nfc ?? value.Nfc
    return keys !== undefined && keys !== null && nfc !== undefined && nfc !== null
  }),
  v.transform((value) => ({
    keys: value.keys ?? value.Keys ?? [],
    nfc: value.nfc ?? value.Nfc ?? false,
  })),
)

export type TwoFactorYubikeyData = v.InferOutput<typeof twoFactorYubikeyDataSchema>
