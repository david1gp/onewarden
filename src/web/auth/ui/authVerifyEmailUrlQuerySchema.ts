import * as v from "valibot"

const authVerifyEmailUrlUserIdSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128))
const authVerifyEmailUrlTokenSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(8_192))
const authVerifyEmailUrlEmailSchema = v.pipe(v.string(), v.trim(), v.maxLength(320))

export const authVerifyEmailUrlQuerySchema = v.strictObject({
  userId: v.optional(authVerifyEmailUrlUserIdSchema, ""),
  token: v.optional(authVerifyEmailUrlTokenSchema, ""),
  email: v.optional(authVerifyEmailUrlEmailSchema, ""),
})

export type AuthVerifyEmailUrlQuery = v.InferOutput<typeof authVerifyEmailUrlQuerySchema>
