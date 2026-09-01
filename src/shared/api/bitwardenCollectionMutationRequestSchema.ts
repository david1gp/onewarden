import * as v from "valibot"
import { bitwardenCollectionAccessSchema } from "./bitwardenCollectionAccessSchema.js"

export const bitwardenCollectionMutationRequestSchema = v.looseObject({
  id: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1)))),
  name: v.string(),
  externalId: v.optional(v.nullable(v.string())),
  groups: v.optional(v.array(bitwardenCollectionAccessSchema), []),
  users: v.optional(v.array(bitwardenCollectionAccessSchema), []),
})

export type BitwardenCollectionMutationRequest = v.InferOutput<typeof bitwardenCollectionMutationRequestSchema>
