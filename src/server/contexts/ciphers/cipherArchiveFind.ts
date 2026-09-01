import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { archives } from "../../database/schema/archives.js"

export function cipherArchiveFind(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<string | null> {
  const op = "cipherArchiveFind"
  try {
    const row = database.drizzle
      .select({ archivedAt: archives.archivedAt })
      .from(archives)
      .where(and(eq(archives.cipherUuid, cipherUuid), eq(archives.userUuid, userUuid)))
      .limit(1)
      .get()
    return resultCreate(row?.archivedAt ?? null)
  } catch {
    return resultErrorCreate(op, "Cipher archive lookup failed.")
  }
}
