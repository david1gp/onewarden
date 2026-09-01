import * as v from "valibot"

export const extensionCipherCardSchema = v.looseObject({
  cardholderName: v.optional(v.nullable(v.string())),
  brand: v.optional(v.nullable(v.string())),
  number: v.optional(v.nullable(v.string())),
  expMonth: v.optional(v.nullable(v.string())),
  expYear: v.optional(v.nullable(v.string())),
  code: v.optional(v.nullable(v.string())),
})

export type ExtensionCipherCard = v.InferOutput<typeof extensionCipherCardSchema>
