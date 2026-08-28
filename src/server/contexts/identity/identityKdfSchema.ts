import * as v from "valibot"

const identityKdfNumberSchema = v.pipe(v.number(), v.integer(), v.minValue(-2_147_483_648), v.maxValue(2_147_483_647))
const identityKdfNullableNumberSchema = v.nullish(identityKdfNumberSchema)

export const identityKdfSchema = v.object({
  kdf: v.optional(identityKdfNumberSchema),
  kdfType: v.optional(identityKdfNumberSchema),
  kdfIterations: v.optional(identityKdfNumberSchema),
  iterations: v.optional(identityKdfNumberSchema),
  kdfMemory: identityKdfNullableNumberSchema,
  memory: identityKdfNullableNumberSchema,
  kdfParallelism: identityKdfNullableNumberSchema,
  parallelism: identityKdfNullableNumberSchema,
})

export type IdentityKdf = v.InferOutput<typeof identityKdfSchema>
