import * as v from "valibot"

export const extensionCipherFieldSchema = v.looseObject({
  name: v.nullable(v.string()),
  value: v.nullable(v.string()),
  type: v.number(),
  linkedId: v.nullable(v.number()),
})

export type ExtensionCipherField = v.InferOutput<typeof extensionCipherFieldSchema>
