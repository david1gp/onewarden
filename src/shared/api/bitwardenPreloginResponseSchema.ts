import * as v from "valibot"

const bitwardenPreloginKdfSettingsSchema = v.looseObject({
  iterations: v.number(),
  kdfType: v.number(),
  memory: v.nullable(v.number()),
  parallelism: v.nullable(v.number()),
})

export const bitwardenPreloginResponseSchema = v.looseObject({
  kdf: v.number(),
  kdfIterations: v.number(),
  kdfMemory: v.nullable(v.number()),
  kdfParallelism: v.nullable(v.number()),
  kdfSettings: bitwardenPreloginKdfSettingsSchema,
  salt: v.nullable(v.string()),
})

export type BitwardenPreloginResponse = v.InferOutput<typeof bitwardenPreloginResponseSchema>
