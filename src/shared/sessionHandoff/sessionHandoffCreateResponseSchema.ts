import * as v from "valibot"

export const sessionHandoffCreateResponseSchema = v.strictObject({
  token: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{43}$/u)),
  expiresAt: v.pipe(v.string(), v.isoTimestamp()),
})

export type SessionHandoffCreateResponse = v.InferOutput<typeof sessionHandoffCreateResponseSchema>
