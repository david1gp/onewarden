import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphers } from "../../database/schema/ciphers.js"
import type { Cipher } from "./cipher.js"
import { cipherProjection } from "./cipherProjection.js"

export function cipherFindByOrganization(database: DatabaseConnection, organizationUuid: string): Result<Cipher[]> {
  const op = "cipherFindByOrganization"
  try {
    const rows = database.drizzle
      .select(cipherProjection)
      .from(ciphers)
      .where(eq(ciphers.organizationUuid, organizationUuid))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Organization cipher lookup failed.")
  }
}
