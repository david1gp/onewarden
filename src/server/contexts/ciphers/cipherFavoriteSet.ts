import { and, count, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type FavoriteInsert, favorites } from "../../database/schema/favorites.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export function cipherFavoriteSet(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  favorite: boolean | null | undefined,
  revisionDate: string,
): Result<void> {
  const op = "cipherFavoriteSet"
  if (favorite === undefined || favorite === null) return resultCreate(undefined)
  try {
    const row = database.drizzle
      .select({ count: count() })
      .from(favorites)
      .where(and(eq(favorites.cipherUuid, cipherUuid), eq(favorites.userUuid, userUuid)))
      .get()
    const current = (row?.count ?? 0) > 0
    if (current === favorite) return resultCreate(undefined)
    const revisionResult = cipherUserRevisionUpdate(database, userUuid, revisionDate)
    if (!revisionResult.success) return revisionResult
    if (favorite) {
      const values: FavoriteInsert = { userUuid, cipherUuid }
      database.drizzle.insert(favorites).values(values).run()
    } else {
      database.drizzle
        .delete(favorites)
        .where(and(eq(favorites.userUuid, userUuid), eq(favorites.cipherUuid, cipherUuid)))
        .run()
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher favorite update failed.")
  }
}
