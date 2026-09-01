import { and, count, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { favorites } from "../../database/schema/favorites.js"

export function cipherFavoriteFind(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<boolean> {
  const op = "cipherFavoriteFind"
  try {
    const row = database.drizzle
      .select({ count: count() })
      .from(favorites)
      .where(and(eq(favorites.cipherUuid, cipherUuid), eq(favorites.userUuid, userUuid)))
      .get()
    return resultCreate((row?.count ?? 0) > 0)
  } catch {
    return resultErrorCreate(op, "Cipher favorite lookup failed.")
  }
}
