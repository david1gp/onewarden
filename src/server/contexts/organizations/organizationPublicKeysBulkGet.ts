import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { users } from "../../database/schema/users.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

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
    for (const membershipUuid of membershipUuids) {
      const row = database.drizzle
        .select({ publicKey: users.publicKey, userUuid: usersOrganizations.userUuid })
        .from(usersOrganizations)
        .innerJoin(users, eq(users.uuid, usersOrganizations.userUuid))
        .where(and(eq(usersOrganizations.uuid, membershipUuid), eq(usersOrganizations.orgUuid, organizationUuid)))
        .limit(1)
        .get()
      if (row === undefined) continue
      response.push({
        object: "organizationUserPublicKeyResponseModel",
        id: membershipUuid,
        userId: row.userUuid,
        key: row.publicKey,
      })
    }
    return resultCreate(response)
  } catch {
    return resultErrorCreate(op, "Public key lookup failed.")
  }
}
