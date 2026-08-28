import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityUser } from "./identityUser.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentityAccountKdf } from "./identityAccountKdf.js"

export function identityAccountKdfApply(user: IdentityUser, kdf: IdentityAccountKdf): Result<void> {
  if (kdf.kdf === 0 && kdf.kdfIterations < 100_000)
    return identityDomainErrorCreate("identityAccountKdfApply", "PBKDF2 KDF iterations must be at least 100000.")
  if (kdf.kdf === 1) {
    if (kdf.kdfIterations < 1)
      return identityDomainErrorCreate("identityAccountKdfApply", "Argon2 KDF iterations must be at least 1.")
    if (kdf.kdfMemory === null)
      return identityDomainErrorCreate("identityAccountKdfApply", "Argon2 memory parameter is required.")
    if (kdf.kdfMemory < 15 || kdf.kdfMemory > 1024)
      return identityDomainErrorCreate("identityAccountKdfApply", "Argon2 memory must be between 15 MB and 1024 MB.")
    if (kdf.kdfParallelism === null)
      return identityDomainErrorCreate("identityAccountKdfApply", "Argon2 parallelism parameter is required.")
    if (kdf.kdfParallelism < 1 || kdf.kdfParallelism > 16)
      return identityDomainErrorCreate("identityAccountKdfApply", "Argon2 parallelism must be between 1 and 16.")
  }

  user.clientKdfType = kdf.kdf
  user.clientKdfIter = kdf.kdfIterations
  user.clientKdfMemory = kdf.kdf === 1 ? kdf.kdfMemory : null
  user.clientKdfParallelism = kdf.kdf === 1 ? kdf.kdfParallelism : null
  return resultCreate(undefined)
}
