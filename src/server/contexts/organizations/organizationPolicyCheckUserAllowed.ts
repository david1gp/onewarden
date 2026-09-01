import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, count, eq, ne, inArray } from "drizzle-orm"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationPolicyFindByOrganizationAndType } from "./organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicyIsApplicableToUser } from "./organizationPolicyIsApplicableToUser.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

export function organizationPolicyCheckUserAllowed(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  action: string,
): Result<void> {
  if (membership.type <= organizationMembershipType.admin || membership.status <= organizationMembershipStatus.invited)
    return resultCreate(undefined)

  const twoFactorResult = organizationPolicyFindByOrganizationAndType(
    database,
    membership.organizationUuid,
    organizationPolicyType.twoFactorAuthentication,
  )
  if (!twoFactorResult.success) return twoFactorResult
  if (twoFactorResult.data?.enabled && !organizationPolicyUserHasTwoFactor(database, membership.userUuid))
    return organizationErrorCreate(
      "organizationPolicyCheckUserAllowed",
      `Cannot ${action} because 2FA is required (membership ${membership.uuid})`,
    )

  const otherOrganizationResult = organizationPolicyIsApplicableToUser(
    database,
    membership.userUuid,
    organizationPolicyType.singleOrganization,
    membership.organizationUuid,
  )
  if (!otherOrganizationResult.success) return otherOrganizationResult
  if (otherOrganizationResult.data)
    return organizationErrorCreate(
      "organizationPolicyCheckUserAllowed",
      `Cannot ${action} because another organization policy forbids it (membership ${membership.uuid})`,
    )

  const singleOrganizationResult = organizationPolicyFindByOrganizationAndType(
    database,
    membership.organizationUuid,
    organizationPolicyType.singleOrganization,
  )
  if (!singleOrganizationResult.success) return singleOrganizationResult
  if (singleOrganizationResult.data?.enabled) {
    const otherMembership = database.drizzle
      .select({ count: count() })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.userUuid, membership.userUuid),
          ne(usersOrganizations.orgUuid, membership.organizationUuid),
          inArray(usersOrganizations.status, [1, 2]),
        ),
      )
      .get()
    if ((otherMembership?.count ?? 0) > 0)
      return organizationErrorCreate(
        "organizationPolicyCheckUserAllowed",
        `Cannot ${action} because the organization policy forbids being part of other organization (membership ${membership.uuid})`,
      )
  }
  return resultCreate(undefined)
}

function organizationPolicyUserHasTwoFactor(database: DatabaseConnection, userUuid: string): boolean {
  return (
    (database.drizzle
      .select({ count: count() })
      .from(twoFactor)
      .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.enabled, true)))
      .get()?.count ?? 0) > 0
  )
}
