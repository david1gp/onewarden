import * as v from "valibot"
import { cipherCustomFieldSchema } from "./cipherCustomFieldSchema.js"
import { cipherTypeSchema } from "./cipherTypeSchema.js"

export const cipherFormDataSchema = v.object({
  type: cipherTypeSchema,
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  notes: v.optional(v.string()),
  favorite: v.boolean(),
  folderId: v.optional(v.nullable(v.string())),
  // Login fields
  username: v.optional(v.string()),
  password: v.optional(v.string()),
  totp: v.optional(v.string()),
  uri: v.optional(v.string()),
  uris: v.optional(
    v.array(
      v.object({
        uri: v.string(),
        match: v.optional(v.nullable(v.number())),
      }),
    ),
  ),
  // Card fields
  cardholderName: v.optional(v.string()),
  brand: v.optional(v.string()),
  number: v.optional(v.string()),
  expMonth: v.optional(v.string()),
  expYear: v.optional(v.string()),
  code: v.optional(v.string()),
  // Identity fields
  title: v.optional(v.string()),
  firstName: v.optional(v.string()),
  middleName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  company: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address1: v.optional(v.string()),
  address2: v.optional(v.string()),
  address3: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  country: v.optional(v.string()),
  ssn: v.optional(v.string()),
  passportNumber: v.optional(v.string()),
  licenseNumber: v.optional(v.string()),
  // Custom fields
  fields: v.array(cipherCustomFieldSchema),
})

export type CipherFormData = v.InferOutput<typeof cipherFormDataSchema>
