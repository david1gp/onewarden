import * as v from "valibot"

const identityAccountKdfIntegerSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(-2_147_483_648),
  v.maxValue(2_147_483_647),
)

export const identityAccountKdfDataSchema = v.object({
  kdf: v.optional(identityAccountKdfIntegerSchema),
  kdfType: v.optional(identityAccountKdfIntegerSchema),
  kdfIterations: v.optional(identityAccountKdfIntegerSchema),
  iterations: v.optional(identityAccountKdfIntegerSchema),
  kdfMemory: v.nullish(identityAccountKdfIntegerSchema),
  memory: v.nullish(identityAccountKdfIntegerSchema),
  kdfParallelism: v.nullish(identityAccountKdfIntegerSchema),
  parallelism: v.nullish(identityAccountKdfIntegerSchema),
})

export type IdentityAccountKdfData = v.InferOutput<typeof identityAccountKdfDataSchema>
