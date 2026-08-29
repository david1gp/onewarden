import * as v from "valibot"

export const adminUserSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  status: v.picklist(["active", "disabled", "invited"]),
  role: v.picklist(["owner", "admin", "user"]),
  twoFactorEnabled: v.boolean(),
  organizationCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  lastActiveAt: v.nullable(v.string()),
  createdAt: v.string(),
  overridden: v.boolean(),
})

export type AdminUser = v.InferOutput<typeof adminUserSchema>
