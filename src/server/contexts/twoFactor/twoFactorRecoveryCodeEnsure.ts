import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { twoFactorRecoveryCodeCreate } from "./twoFactorRecoveryCodeCreate.js"

export function twoFactorRecoveryCodeEnsure(database: DatabaseConnection, user: IdentityUser): Result<string> {
  const op = "twoFactorRecoveryCodeEnsure"
  try {
    const existing = database
      .query<{ totp_recover: string | null }, [string]>("SELECT totp_recover FROM users WHERE uuid = ? LIMIT 1")
      .get(user.uuid)
    if (existing === null) return resultErrorCreate(op, "Recovery code save failed.")
    if (existing.totp_recover !== null) {
      user.totpRecover = existing.totp_recover
      return resultCreate(existing.totp_recover)
    }
    const codeResult = twoFactorRecoveryCodeCreate()
    if (!codeResult.success) return codeResult
    database.run("UPDATE users SET totp_recover = COALESCE(totp_recover, ?) WHERE uuid = ?", [
      codeResult.data,
      user.uuid,
    ])
    const saved = database
      .query<{ totp_recover: string | null }, [string]>("SELECT totp_recover FROM users WHERE uuid = ? LIMIT 1")
      .get(user.uuid)
    if (saved === null || saved.totp_recover === null) return resultErrorCreate(op, "Recovery code save failed.")
    user.totpRecover = saved.totp_recover
    return resultCreate(saved.totp_recover)
  } catch {
    return resultErrorCreate(op, "Recovery code save failed.")
  }
}
