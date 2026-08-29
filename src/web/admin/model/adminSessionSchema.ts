import * as v from "valibot"

export const adminSessionSchema = v.object({
  isAuthenticated: v.boolean(),
  token: v.optional(v.string()),
  authenticatedAt: v.optional(v.string()),
})

export type AdminSession = v.InferOutput<typeof adminSessionSchema>
