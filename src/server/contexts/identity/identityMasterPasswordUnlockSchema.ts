import * as v from "valibot"

export const identityMasterPasswordUnlockSchema = v.object({
  Kdf: v.object({
    KdfType: v.number(),
    Iterations: v.number(),
    Memory: v.nullable(v.number()),
    Parallelism: v.nullable(v.number()),
  }),
  MasterKeyEncryptedUserKey: v.string(),
  MasterKeyWrappedUserKey: v.string(),
  Salt: v.string(),
})
