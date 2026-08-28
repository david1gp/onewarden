import * as v from "valibot"

export const identityRegistrationVerificationDataSchema = v.object({
  email: v.string(),
  name: v.nullish(v.string()),
})

export type IdentityRegistrationVerificationData = v.InferOutput<typeof identityRegistrationVerificationDataSchema>
