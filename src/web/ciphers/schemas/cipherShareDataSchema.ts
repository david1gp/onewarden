import * as v from "valibot"

export const cipherShareDataSchema = v.object({
  organizationId: v.string(),
  collectionIds: v.array(v.string()),
})

export type CipherShareData = v.InferOutput<typeof cipherShareDataSchema>
