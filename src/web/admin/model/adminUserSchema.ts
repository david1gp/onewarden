import * as v from "valibot"

export const adminUserSchema = v.object({
  id: v.string(),
  name: v.nullable(v.string()),
  email: v.string(),
  emailVerified: v.optional(v.boolean()),
  userEnabled: v.boolean(),
  twoFactorEnabled: v.boolean(),
  createdAt: v.string(),
  creationDate: v.optional(v.string()),
  lastActive: v.optional(v.nullable(v.string())),
  organizations: v.optional(
    v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        status: v.number(),
        type: v.number(),
      }),
    ),
  ),
})

export type AdminUser = v.InferOutput<typeof adminUserSchema>
