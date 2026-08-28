import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"

export async function identityPrelogin(
  database: DatabaseConnection | undefined,
  email: string,
): Promise<
  Result<{
    kdf: number
    kdfIterations: number
    kdfMemory: number | null
    kdfParallelism: number | null
    kdfSettings: {
      iterations: number
      kdfType: number
      memory: number | null
      parallelism: number | null
    }
    salt: null
  }>
> {
  const op = "identityPrelogin"
  if (database === undefined)
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })

  const userResult = identityUserFindByEmail(database, email)
  if (!userResult.success) return userResult
  const user = userResult.data
  const kdf = user?.clientKdfType ?? 0
  const kdfIterations = user?.clientKdfIter ?? 600_000
  const kdfMemory = user?.clientKdfMemory ?? null
  const kdfParallelism = user?.clientKdfParallelism ?? null
  return resultCreate({
    kdf,
    kdfIterations,
    kdfMemory,
    kdfParallelism,
    kdfSettings: { iterations: kdfIterations, kdfType: kdf, memory: kdfMemory, parallelism: kdfParallelism },
    salt: null,
  })
}
