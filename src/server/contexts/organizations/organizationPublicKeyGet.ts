import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { organizations } from "../../database/schema/organizations.js"
import type { Organization } from "./organization.js"

type OrganizationPublicKey = Pick<Organization, "publicKey">

export function organizationPublicKeyGet(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationPublicKey | null> {
  const op = "organizationPublicKeyGet"
  try {
    const row = database.drizzle
      .select({ publicKey: organizations.publicKey })
      .from(organizations)
      .where(eq(organizations.uuid, organizationUuid))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.")
  }
}
