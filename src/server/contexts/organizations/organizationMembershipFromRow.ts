import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { UserOrganizationRow } from "../../database/schema/usersOrganizations.js"

export function organizationMembershipFromRow(row: UserOrganizationRow): OrganizationMembership {
  return {
    accessAll: row.accessAll,
    akey: row.akey,
    externalId: row.externalId,
    invitedByEmail: row.invitedByEmail,
    organizationUuid: row.orgUuid,
    resetPasswordKey: row.resetPasswordKey,
    status: row.status,
    type: row.atype,
    userUuid: row.userUuid,
    uuid: row.uuid,
  }
}
