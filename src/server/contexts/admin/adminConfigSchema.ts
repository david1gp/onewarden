import * as v from "valibot"

const adminConfigTokenSchema = v.pipe(v.string(), v.trim())
const adminConfigBooleanSchema = v.boolean()
const adminConfigLifetimeSchema = v.pipe(v.number(), v.integer(), v.minValue(1))
const adminConfigOrganizationNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1))

export const adminConfigSchema = v.object({
  ADMIN_TOKEN: v.optional(adminConfigTokenSchema),
  DISABLE_ADMIN_TOKEN: adminConfigBooleanSchema,
  ADMIN_SESSION_LIFETIME: adminConfigLifetimeSchema,
  INVITATION_ORG_NAME: adminConfigOrganizationNameSchema,
})

export type AdminConfig = v.InferOutput<typeof adminConfigSchema>
