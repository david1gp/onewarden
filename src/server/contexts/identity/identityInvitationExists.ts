import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function identityInvitationExists(database: DatabaseConnection, email: string): Result<boolean> {
  const op = "identityInvitationExists"
  try {
    const row = database
      .query<{ email: string }, [string]>("SELECT email FROM invitations WHERE email = ? LIMIT 1")
      .get(email.toLowerCase())
    return resultCreate(row !== null)
  } catch {
    return resultErrorCreate(op, "Invitation lookup failed.")
  }
}
