import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphers } from "../../database/schema/ciphers.js"
import type { Cipher } from "./cipher.js"
import { cipherProjection } from "./cipherProjection.js"

export function cipherFindByUuid(database: DatabaseConnection, uuid: string): Result<Cipher | null> {
  const op = "cipherFindByUuid"
  try {
    const row = database.drizzle.select(cipherProjection).from(ciphers).where(eq(ciphers.uuid, uuid)).limit(1).get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Cipher lookup failed.")
  }
}
