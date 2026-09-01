import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { users } from "../../database/schema/users.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { twoFactorRecoveryCodeCreate } from "./twoFactorRecoveryCodeCreate.js"
import { eq, sql } from "drizzle-orm"

export function twoFactorRecoveryCodeEnsure(database: DatabaseConnection, user: IdentityUser): Result<string> {
  const op = "twoFactorRecoveryCodeEnsure"
  try {
    const existing = database.drizzle
      .select({ totpRecover: users.totpRecover })
      .from(users)
      .where(eq(users.uuid, user.uuid))
      .limit(1)
      .get()
    if (existing === undefined) return resultErrorCreate(op, "Recovery code save failed.")
    if (existing.totpRecover !== null) {
      user.totpRecover = existing.totpRecover
      return resultCreate(existing.totpRecover)
    }
    const codeResult = twoFactorRecoveryCodeCreate()
    if (!codeResult.success) return codeResult
    database.drizzle
      .update(users)
      .set({ totpRecover: sql`coalesce(${users.totpRecover}, ${codeResult.data})` })
      .where(eq(users.uuid, user.uuid))
      .run()
    const saved = database.drizzle
      .select({ totpRecover: users.totpRecover })
      .from(users)
      .where(eq(users.uuid, user.uuid))
      .limit(1)
      .get()
    if (saved === undefined || saved.totpRecover === null) return resultErrorCreate(op, "Recovery code save failed.")
    user.totpRecover = saved.totpRecover
    return resultCreate(saved.totpRecover)
  } catch {
    return resultErrorCreate(op, "Recovery code save failed.")
  }
}
