import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function identityInvitationTake(database: DatabaseConnection, email: string): Result<boolean> {
  const op = "identityInvitationTake"
  try {
    const result = database.run("DELETE FROM invitations WHERE email = ?", [email.toLowerCase()])
    return resultCreate(result.changes > 0)
  } catch {
    return resultErrorCreate(op, "Invitation consume failed.")
  }
}
