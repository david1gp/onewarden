import * as v from "valibot"

const twoFactorWebAuthnU2fDeleteByteSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))
const twoFactorWebAuthnU2fDeleteKeySchema = v.union([v.array(twoFactorWebAuthnU2fDeleteByteSchema), v.string()])
const twoFactorWebAuthnU2fDeleteRegistrationSchema = v.looseObject({
  keyHandle: v.optional(v.nullable(twoFactorWebAuthnU2fDeleteKeySchema)),
  key_handle: v.optional(v.nullable(twoFactorWebAuthnU2fDeleteKeySchema)),
})

export const twoFactorWebAuthnU2fDeleteDataSchema = v.array(
  v.looseObject({
    reg: v.optional(v.nullable(twoFactorWebAuthnU2fDeleteRegistrationSchema)),
  }),
)

export type TwoFactorWebAuthnU2fDeleteData = v.InferOutput<typeof twoFactorWebAuthnU2fDeleteDataSchema>
