import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { eq, inArray } from "drizzle-orm"
import { archives } from "../../database/schema/archives.js"
import { attachments } from "../../database/schema/attachments.js"
import { ciphers } from "../../database/schema/ciphers.js"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { favorites } from "../../database/schema/favorites.js"
import { foldersCiphers } from "../../database/schema/foldersCiphers.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { organizationApiKey } from "../../database/schema/organizationApiKey.js"
import { organizationDomains } from "../../database/schema/organizationDomains.js"
import { organizationSsoConfigs } from "../../database/schema/organizationSsoConfigs.js"
import { organizations } from "../../database/schema/organizations.js"
import { ssoAuth } from "../../database/schema/ssoAuth.js"
import { users } from "../../database/schema/users.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationPolicyDeleteAllByOrganization } from "./organizationPolicyDeleteAllByOrganization.js"

export function organizationDelete(
  database: DatabaseConnection,
  organizationUuid: string,
  revisionDate: string,
): Result<void> {
  const organizationResult = organizationFindByUuid(database, organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null)
    return organizationErrorCreate("organizationDelete", "Organization not found", 404)

  return databaseTransaction(database, () => {
    try {
      const memberUserUuids = database.drizzle
        .select({ userUuid: usersOrganizations.userUuid })
        .from(usersOrganizations)
        .where(eq(usersOrganizations.orgUuid, organizationUuid))
        .all()
        .map((row) => row.userUuid)
      if (memberUserUuids.length > 0)
        database.drizzle
          .update(users)
          .set({ updatedAt: revisionDate })
          .where(inArray(users.uuid, memberUserUuids))
          .run()
      const policyDeleteResult = organizationPolicyDeleteAllByOrganization(database, organizationUuid)
      if (!policyDeleteResult.success) return policyDeleteResult
      database.drizzle.delete(ssoAuth).where(eq(ssoAuth.organizationUuid, organizationUuid)).run()
      database.drizzle.delete(organizationDomains).where(eq(organizationDomains.orgUuid, organizationUuid)).run()
      database.drizzle.delete(organizationSsoConfigs).where(eq(organizationSsoConfigs.orgUuid, organizationUuid)).run()
      const groupUuids = database.drizzle
        .select({ uuid: groups.uuid })
        .from(groups)
        .where(eq(groups.organizationsUuid, organizationUuid))
      database.drizzle.delete(groupsUsers).where(inArray(groupsUsers.groupsUuid, groupUuids)).run()
      const collectionUuids = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(eq(collections.orgUuid, organizationUuid))
      database.drizzle
        .delete(collectionsGroups)
        .where(inArray(collectionsGroups.collectionsUuid, collectionUuids))
        .run()
      database.drizzle
        .delete(ciphersCollections)
        .where(inArray(ciphersCollections.collectionUuid, collectionUuids))
        .run()
      database.drizzle.delete(usersCollections).where(inArray(usersCollections.collectionUuid, collectionUuids)).run()
      const cipherUuids = database.drizzle
        .select({ uuid: ciphers.uuid })
        .from(ciphers)
        .where(eq(ciphers.organizationUuid, organizationUuid))
      database.drizzle.delete(favorites).where(inArray(favorites.cipherUuid, cipherUuids)).run()
      database.drizzle.delete(archives).where(inArray(archives.cipherUuid, cipherUuids)).run()
      database.drizzle.delete(foldersCiphers).where(inArray(foldersCiphers.cipherUuid, cipherUuids)).run()
      database.drizzle.delete(attachments).where(inArray(attachments.cipherUuid, cipherUuids)).run()
      database.drizzle.delete(ciphers).where(eq(ciphers.organizationUuid, organizationUuid)).run()
      database.drizzle.delete(collections).where(eq(collections.orgUuid, organizationUuid)).run()
      database.drizzle.delete(groups).where(eq(groups.organizationsUuid, organizationUuid)).run()
      database.drizzle.delete(usersOrganizations).where(eq(usersOrganizations.orgUuid, organizationUuid)).run()
      database.drizzle.delete(organizationApiKey).where(eq(organizationApiKey.orgUuid, organizationUuid)).run()
      database.drizzle.delete(organizations).where(eq(organizations.uuid, organizationUuid)).run()
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("organizationDelete", "Organization deletion failed.")
    }
  })
}
