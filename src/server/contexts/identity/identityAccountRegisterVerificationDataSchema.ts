import * as v from "valibot"

export const identityAccountRegisterVerificationDataSchema = v.object({
  email: v.string(),
  name: v.nullish(v.string()),
})

export type IdentityAccountRegisterVerificationData = v.InferOutput<
  typeof identityAccountRegisterVerificationDataSchema
>
