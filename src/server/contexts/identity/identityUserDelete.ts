import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "./identityUser.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"

export function identityUserDelete(database: DatabaseConnection, user: IdentityUser): Result<void> {
  let owner: { uuid: string } | null
  try {
    owner = database
      .query<{ uuid: string }, [string]>(
        `SELECT member.uuid
         FROM users_organizations AS member
         WHERE member.user_uuid = ?
           AND member.status = 2
           AND member.atype = 0
           AND (
             SELECT COUNT(*)
             FROM users_organizations AS owner
             WHERE owner.org_uuid = member.org_uuid
               AND owner.status = 2
               AND owner.atype = 0
           ) <= 1
         LIMIT 1`,
      )
      .get(user.uuid)
  } catch {
    return resultErrorCreate("identityUserDelete", "User deletion failed.")
  }
  if (owner !== null) return identityDomainErrorCreate("identityUserDelete", "Can't delete last owner")

  return databaseTransaction(database, () => {
    try {
      database.run(
        `DELETE FROM groups_users
         WHERE users_organizations_uuid IN (
           SELECT uuid FROM users_organizations WHERE user_uuid = ?
         )`,
        [user.uuid],
      )
      database.run("DELETE FROM users_collections WHERE user_uuid = ?", [user.uuid])
      database.run(
        `DELETE FROM folders_ciphers
          WHERE folder_uuid IN (SELECT uuid FROM folders WHERE user_uuid = ?)`,
        [user.uuid],
      )
      database.run("DELETE FROM folders WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM favorites WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM archives WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM ciphers WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM sso_users WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM users_organizations WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM invitations WHERE email = ?", [user.email])
      database.run(
        `DELETE FROM emergency_access
         WHERE grantor_uuid = ? OR grantee_uuid = ? OR email = ?`,
        [user.uuid, user.uuid, user.email],
      )
      database.run("DELETE FROM devices WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM users WHERE uuid = ?", [user.uuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("identityUserDelete", "User deletion failed.")
    }
  })
}
