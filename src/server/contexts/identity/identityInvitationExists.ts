import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { invitations } from "../../database/schema/invitations.js"
import { eq } from "drizzle-orm"

export function identityInvitationExists(database: DatabaseConnection, email: string): Result<boolean> {
  const op = "identityInvitationExists"
  try {
    const row = database.drizzle
      .select({ email: invitations.email })
      .from(invitations)
      .where(eq(invitations.email, email.toLowerCase()))
      .limit(1)
      .get()
    return resultCreate(row !== undefined)
  } catch {
    return resultErrorCreate(op, "Invitation lookup failed.")
  }
}
