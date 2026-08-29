import * as v from "valibot"

export const cipherIdentityDataSchema = v.object({
  title: v.optional(v.nullable(v.string())),
  firstName: v.optional(v.nullable(v.string())),
  middleName: v.optional(v.nullable(v.string())),
  lastName: v.optional(v.nullable(v.string())),
  address1: v.optional(v.nullable(v.string())),
  address2: v.optional(v.nullable(v.string())),
  address3: v.optional(v.nullable(v.string())),
  city: v.optional(v.nullable(v.string())),
  state: v.optional(v.nullable(v.string())),
  postalCode: v.optional(v.nullable(v.string())),
  country: v.optional(v.nullable(v.string())),
  company: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  phone: v.optional(v.nullable(v.string())),
  ssn: v.optional(v.nullable(v.string())),
  username: v.optional(v.nullable(v.string())),
  passportNumber: v.optional(v.nullable(v.string())),
  licenseNumber: v.optional(v.nullable(v.string())),
})

export type CipherIdentityData = v.InferOutput<typeof cipherIdentityDataSchema>
