import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { users } from "../../database/schema/users.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export function organizationMembershipSave(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  revisionDate: string,
): Result<void> {
  const op = "organizationMembershipSave"
  try {
    database.drizzle.update(users).set({ updatedAt: revisionDate }).where(eq(users.uuid, membership.userUuid)).run()
    database.drizzle
      .insert(usersOrganizations)
      .values({
        uuid: membership.uuid,
        userUuid: membership.userUuid,
        orgUuid: membership.organizationUuid,
        invitedByEmail: membership.invitedByEmail,
        accessAll: membership.accessAll,
        akey: membership.akey,
        status: membership.status,
        atype: membership.type,
        resetPasswordKey: membership.resetPasswordKey,
        externalId: membership.externalId,
      })
      .onConflictDoUpdate({
        target: usersOrganizations.uuid,
        set: {
          userUuid: membership.userUuid,
          orgUuid: membership.organizationUuid,
          invitedByEmail: membership.invitedByEmail,
          accessAll: membership.accessAll,
          akey: membership.akey,
          status: membership.status,
          atype: membership.type,
          resetPasswordKey: membership.resetPasswordKey,
          externalId: membership.externalId,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization membership save failed.")
  }
}
