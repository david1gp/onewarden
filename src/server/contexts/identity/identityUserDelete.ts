import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import { archives } from "../../database/schema/archives.js"
import { ciphers } from "../../database/schema/ciphers.js"
import { devices } from "../../database/schema/devices.js"
import { emergencyAccess } from "../../database/schema/emergencyAccess.js"
import { favorites } from "../../database/schema/favorites.js"
import { folders } from "../../database/schema/folders.js"
import { foldersCiphers } from "../../database/schema/foldersCiphers.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { invitations } from "../../database/schema/invitations.js"
import { ssoUsers } from "../../database/schema/ssoUsers.js"
import { users } from "../../database/schema/users.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { IdentityUser } from "./identityUser.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { twoFactorRecordDeleteAllByUser } from "../twoFactor/twoFactorRecordDeleteAllByUser.js"
import { and, eq, inArray, or } from "drizzle-orm"

export function identityUserDelete(database: DatabaseConnection, user: IdentityUser): Result<void> {
  let owner: { uuid: string } | null = null
  try {
    const ownerCandidates = database.drizzle
      .select({ uuid: usersOrganizations.uuid, organizationUuid: usersOrganizations.orgUuid })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.userUuid, user.uuid),
          eq(usersOrganizations.status, 2),
          eq(usersOrganizations.atype, 0),
        ),
      )
      .all()
    for (const candidate of ownerCandidates) {
      const owners = database.drizzle
        .select({ uuid: usersOrganizations.uuid })
        .from(usersOrganizations)
        .where(
          and(
            eq(usersOrganizations.orgUuid, candidate.organizationUuid),
            eq(usersOrganizations.status, 2),
            eq(usersOrganizations.atype, 0),
          ),
        )
        .all()
      if (owners.length <= 1) {
        owner = { uuid: candidate.uuid }
        break
      }
    }
  } catch {
    return resultErrorCreate("identityUserDelete", "User deletion failed.")
  }
  if (owner !== null) return identityDomainErrorCreate("identityUserDelete", "Can't delete last owner")

  return databaseTransaction(database, () => {
    try {
      const membershipUuids = database.drizzle
        .select({ uuid: usersOrganizations.uuid })
        .from(usersOrganizations)
        .where(eq(usersOrganizations.userUuid, user.uuid))
      database.drizzle.delete(groupsUsers).where(inArray(groupsUsers.usersOrganizationsUuid, membershipUuids)).run()
      database.drizzle.delete(usersCollections).where(eq(usersCollections.userUuid, user.uuid)).run()
      const folderUuids = database.drizzle
        .select({ uuid: folders.uuid })
        .from(folders)
        .where(eq(folders.userUuid, user.uuid))
      database.drizzle.delete(foldersCiphers).where(inArray(foldersCiphers.folderUuid, folderUuids)).run()
      database.drizzle.delete(folders).where(eq(folders.userUuid, user.uuid)).run()
      database.drizzle.delete(favorites).where(eq(favorites.userUuid, user.uuid)).run()
      database.drizzle.delete(archives).where(eq(archives.userUuid, user.uuid)).run()
      database.drizzle.delete(ciphers).where(eq(ciphers.userUuid, user.uuid)).run()
      database.drizzle.delete(ssoUsers).where(eq(ssoUsers.userUuid, user.uuid)).run()
      database.drizzle.delete(usersOrganizations).where(eq(usersOrganizations.userUuid, user.uuid)).run()
      database.drizzle.delete(invitations).where(eq(invitations.email, user.email)).run()
      database.drizzle
        .delete(emergencyAccess)
        .where(
          or(
            eq(emergencyAccess.grantorUuid, user.uuid),
            eq(emergencyAccess.granteeUuid, user.uuid),
            eq(emergencyAccess.email, user.email),
          ),
        )
        .run()
      const twoFactorDeleteResult = twoFactorRecordDeleteAllByUser(database, user.uuid)
      if (!twoFactorDeleteResult.success) return twoFactorDeleteResult
      database.drizzle.delete(devices).where(eq(devices.userUuid, user.uuid)).run()
      database.drizzle.delete(users).where(eq(users.uuid, user.uuid)).run()
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("identityUserDelete", "User deletion failed.")
    }
  })
}
