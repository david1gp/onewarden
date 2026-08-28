import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

type OrganizationPublicKeyResponse = {
  object: "organizationUserPublicKeyResponseModel"
  id: string
  userId: string
  key: string | null
}

export function organizationPublicKeysBulkGet(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuids: readonly string[],
): Result<OrganizationPublicKeyResponse[]> {
  const op = "organizationPublicKeysBulkGet"
  try {
    const response: OrganizationPublicKeyResponse[] = []
    const membershipQuery = database.query<{ user_uuid: string; public_key: string | null }, [string, string]>(
      `SELECT member.user_uuid, user.public_key
       FROM users_organizations AS member
       JOIN users AS user ON user.uuid = member.user_uuid
       WHERE member.uuid = ? AND member.org_uuid = ?
       LIMIT 1`,
    )
    for (const membershipUuid of membershipUuids) {
      const row = membershipQuery.get(membershipUuid, organizationUuid)
      if (row === null) continue
      response.push({
        object: "organizationUserPublicKeyResponseModel",
        id: membershipUuid,
        userId: row.user_uuid,
        key: row.public_key,
      })
    }
    return resultCreate(response)
  } catch {
    return resultErrorCreate(op, "Public key lookup failed.")
  }
}
