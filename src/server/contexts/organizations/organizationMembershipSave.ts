import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export function organizationMembershipSave(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  revisionDate: string,
): Result<void> {
  const op = "organizationMembershipSave"
  try {
    database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [revisionDate, membership.userUuid])
    database.run(
      `INSERT INTO users_organizations (
         uuid, user_uuid, org_uuid, invited_by_email, access_all, akey, status, atype,
         reset_password_key, external_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         user_uuid = excluded.user_uuid,
         org_uuid = excluded.org_uuid,
         invited_by_email = excluded.invited_by_email,
         access_all = excluded.access_all,
         akey = excluded.akey,
         status = excluded.status,
         atype = excluded.atype,
         reset_password_key = excluded.reset_password_key,
         external_id = excluded.external_id`,
      [
        membership.uuid,
        membership.userUuid,
        membership.organizationUuid,
        membership.invitedByEmail,
        membership.accessAll ? 1 : 0,
        membership.akey,
        membership.status,
        membership.type,
        membership.resetPasswordKey,
        membership.externalId,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization membership save failed.")
  }
}
