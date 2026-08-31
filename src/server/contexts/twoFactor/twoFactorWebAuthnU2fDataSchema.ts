import * as v from "valibot"

const twoFactorWebAuthnU2fByteSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))
const twoFactorWebAuthnU2fByteArraySchema = v.array(twoFactorWebAuthnU2fByteSchema)
const twoFactorWebAuthnU2fRegistrationDataSchema = v.pipe(
  v.looseObject({
    keyHandle: v.optional(v.nullable(v.union([twoFactorWebAuthnU2fByteArraySchema, v.string()]))),
    key_handle: v.optional(v.nullable(v.union([twoFactorWebAuthnU2fByteArraySchema, v.string()]))),
    pubKey: v.optional(v.nullable(v.union([twoFactorWebAuthnU2fByteArraySchema, v.string()]))),
    pub_key: v.optional(v.nullable(v.union([twoFactorWebAuthnU2fByteArraySchema, v.string()]))),
  }),
  v.check((value) => {
    const keyHandle = value.keyHandle ?? value.key_handle
    const publicKey = value.pubKey ?? value.pub_key
    return keyHandle !== undefined && keyHandle !== null && publicKey !== undefined && publicKey !== null
  }),
)

export const twoFactorWebAuthnU2fDataSchema = v.array(
  v.looseObject({
    counter: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(5)),
    migrated: v.optional(v.nullable(v.boolean())),
    name: v.string(),
    reg: twoFactorWebAuthnU2fRegistrationDataSchema,
  }),
)

export type TwoFactorWebAuthnU2fData = v.InferOutput<typeof twoFactorWebAuthnU2fDataSchema>
