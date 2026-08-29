import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Organization } from "./organization.js"

type OrganizationPublicKey = Pick<Organization, "publicKey">

export function organizationPublicKeyGet(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationPublicKey | null> {
  const op = "organizationPublicKeyGet"
  try {
    const row = database
      .query<OrganizationPublicKey, [string]>(
        "SELECT public_key AS publicKey FROM organizations WHERE uuid = ? LIMIT 1",
      )
      .get(organizationUuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.")
  }
}
