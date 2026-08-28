import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { OrganizationMembershipRow } from "./organizationMembershipRow.js"

export function organizationMembershipFromRow(row: OrganizationMembershipRow): OrganizationMembership {
  return {
    accessAll: row.access_all === 1,
    akey: row.akey,
    externalId: row.external_id,
    invitedByEmail: row.invited_by_email,
    organizationUuid: row.org_uuid,
    resetPasswordKey: row.reset_password_key,
    status: row.status,
    type: row.atype,
    userUuid: row.user_uuid,
    uuid: row.uuid,
  }
}
