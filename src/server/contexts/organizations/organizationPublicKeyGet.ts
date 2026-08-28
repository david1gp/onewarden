import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

type OrganizationPublicKey = {
  publicKey: string | null
}

export function organizationPublicKeyGet(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationPublicKey | null> {
  const op = "organizationPublicKeyGet"
  try {
    const row = database
      .query<{ public_key: string | null }, [string]>("SELECT public_key FROM organizations WHERE uuid = ? LIMIT 1")
      .get(organizationUuid)
    return resultCreate(row === null ? null : { publicKey: row.public_key })
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.")
  }
}
