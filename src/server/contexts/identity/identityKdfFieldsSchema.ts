import * as v from "valibot"

const identityKdfIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(-2_147_483_648), v.maxValue(2_147_483_647))
const identityKdfNullableIntegerSchema = v.nullish(identityKdfIntegerSchema)

export const identityKdfFieldsSchema = {
  kdf: v.optional(identityKdfIntegerSchema),
  kdfType: v.optional(identityKdfIntegerSchema),
  kdfIterations: v.optional(identityKdfIntegerSchema),
  iterations: v.optional(identityKdfIntegerSchema),
  kdfMemory: identityKdfNullableIntegerSchema,
  memory: identityKdfNullableIntegerSchema,
  kdfParallelism: identityKdfNullableIntegerSchema,
  parallelism: identityKdfNullableIntegerSchema,
}
