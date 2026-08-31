import * as v from "valibot"

export const adminLoginFormSchema = v.object({
  redirect: v.optional(v.string()),
  token: v.string(),
})

export type AdminLoginForm = v.InferOutput<typeof adminLoginFormSchema>
