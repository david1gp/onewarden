import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { invitations } from "../../database/schema/invitations.js"
import { eq } from "drizzle-orm"

export function identityInvitationTake(database: DatabaseConnection, email: string): Result<boolean> {
  const op = "identityInvitationTake"
  try {
    const result = database.drizzle
      .delete(invitations)
      .where(eq(invitations.email, email.toLowerCase()))
      .returning({ email: invitations.email })
      .get()
    return resultCreate(result !== undefined)
  } catch {
    return resultErrorCreate(op, "Invitation consume failed.")
  }
}
