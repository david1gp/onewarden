import * as v from "valibot"

export const cipherLoginDataSchema = v.object({
  username: v.optional(v.nullable(v.string())),
  password: v.optional(v.nullable(v.string())),
  totp: v.optional(v.nullable(v.string())),
  uris: v.optional(
    v.nullable(
      v.array(
        v.object({
          uri: v.string(),
          match: v.optional(v.nullable(v.number())),
        }),
      ),
    ),
  ),
  passwordRevisionDate: v.optional(v.nullable(v.string())),
})

export type CipherLoginData = v.InferOutput<typeof cipherLoginDataSchema>
