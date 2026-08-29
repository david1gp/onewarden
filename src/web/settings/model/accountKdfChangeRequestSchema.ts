import * as v from "valibot"

export const accountKdfChangeRequestSchema = v.object({
  masterPasswordHash: v.string(),
  authenticationData: v.object({
    masterPasswordAuthenticationHash: v.string(),
    kdf: v.object({
      kdfType: v.number(),
      kdfIterations: v.number(),
      kdfMemory: v.nullable(v.number()),
      kdfParallelism: v.nullable(v.number()),
    }),
    salt: v.string(),
  }),
  unlockData: v.object({
    masterKeyWrappedUserKey: v.string(),
    kdf: v.object({
      kdfType: v.number(),
      kdfIterations: v.number(),
      kdfMemory: v.nullable(v.number()),
      kdfParallelism: v.nullable(v.number()),
    }),
    salt: v.string(),
  }),
})

export type AccountKdfChangeRequest = v.InferOutput<typeof accountKdfChangeRequestSchema>
