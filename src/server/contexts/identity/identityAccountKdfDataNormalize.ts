import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityAccountKdf } from "./identityAccountKdf.js"
import type { IdentityAccountKdfData } from "./identityAccountKdfDataSchema.js"

export function identityAccountKdfDataNormalize(data: IdentityAccountKdfData): Result<IdentityAccountKdf> {
  const kdf = data.kdf ?? data.kdfType
  const kdfIterations = data.kdfIterations ?? data.iterations
  const kdfMemory = data.kdfMemory === undefined ? (data.memory ?? null) : data.kdfMemory
  const kdfParallelism = data.kdfParallelism === undefined ? (data.parallelism ?? null) : data.kdfParallelism
  if (kdf === undefined || kdfIterations === undefined)
    return identityDomainErrorCreate("identityAccountKdfDataNormalize", "Invalid KDF settings.")
  return resultCreate({ kdf, kdfIterations, kdfMemory, kdfParallelism })
}
