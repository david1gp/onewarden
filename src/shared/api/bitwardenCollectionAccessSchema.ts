import * as v from "valibot"

export const bitwardenCollectionAccessSchema = v.object({
  hidePasswords: v.boolean(),
  id: v.pipe(v.string(), v.minLength(1)),
  manage: v.boolean(),
  readOnly: v.boolean(),
})

export type BitwardenCollectionAccess = v.InferOutput<typeof bitwardenCollectionAccessSchema>
