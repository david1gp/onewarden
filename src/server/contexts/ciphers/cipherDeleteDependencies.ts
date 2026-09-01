import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { archives } from "../../database/schema/archives.js"
import { attachments } from "../../database/schema/attachments.js"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"
import { favorites } from "../../database/schema/favorites.js"
import { foldersCiphers } from "../../database/schema/foldersCiphers.js"

export function cipherDeleteDependencies(database: DatabaseConnection, cipherUuid: string): Result<void> {
  const op = "cipherDeleteDependencies"
  try {
    database.drizzle.delete(foldersCiphers).where(eq(foldersCiphers.cipherUuid, cipherUuid)).run()
    database.drizzle.delete(ciphersCollections).where(eq(ciphersCollections.cipherUuid, cipherUuid)).run()
    database.drizzle.delete(favorites).where(eq(favorites.cipherUuid, cipherUuid)).run()
    database.drizzle.delete(archives).where(eq(archives.cipherUuid, cipherUuid)).run()
    database.drizzle.delete(attachments).where(eq(attachments.cipherUuid, cipherUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher dependency deletion failed.")
  }
}
