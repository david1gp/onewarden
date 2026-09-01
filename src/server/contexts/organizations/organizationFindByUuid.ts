import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { organizations } from "../../database/schema/organizations.js"
import type { Organization } from "./organization.js"

export function organizationFindByUuid(database: DatabaseConnection, uuid: string): Result<Organization | null> {
  const op = "organizationFindByUuid"
  try {
    const row = database.drizzle
      .select({
        billingEmail: organizations.billingEmail,
        identifier: organizations.identifier,
        name: organizations.name,
        privateKey: organizations.privateKey,
        publicKey: organizations.publicKey,
        uuid: organizations.uuid,
      })
      .from(organizations)
      .where(eq(organizations.uuid, uuid))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.")
  }
}
