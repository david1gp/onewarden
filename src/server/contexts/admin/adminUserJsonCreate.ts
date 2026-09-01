import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserProfileToJson } from "../identity/identityUserProfileToJson.js"
import { and, count, eq, max } from "drizzle-orm"
import { devices } from "../../database/schema/devices.js"
import { organizations } from "../../database/schema/organizations.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function adminUserJsonCreate(
  database: DatabaseConnection,
  user: IdentityUser,
  config: IdentityConfig,
  includeLastActive: boolean,
): Result<Record<string, unknown>> {
  const op = "adminUserJsonCreate"
  let lastActive: string | null = null
  if (includeLastActive) {
    try {
      const row = database.drizzle
        .select({ updatedAt: max(devices.updatedAt) })
        .from(devices)
        .where(eq(devices.userUuid, user.uuid))
        .get()
      lastActive = row?.updatedAt === null || row?.updatedAt === undefined ? null : adminDateFormat(row.updatedAt)
    } catch {
      return resultErrorCreate(op, "User activity lookup failed.", { code: "platform.internal" })
    }
  }
  const profile = identityUserProfileToJson(user, config) as Record<string, unknown>
  const organizationsResult = adminUserOrganizationsFind(database, user.uuid, config)
  if (!organizationsResult.success) return organizationsResult
  return resultCreate({
    ...profile,
    userEnabled: user.enabled,
    createdAt: adminDateFormat(user.createdAt),
    creationDate: adminDateFormat(user.createdAt),
    twoFactorEnabled: adminTwoFactorEnabledFind(database, user.uuid),
    organizations: organizationsResult.data,
    ...(includeLastActive ? { lastActive } : {}),
  })
}

type AdminUserOrganizationRow = {
  accessAll: boolean
  akey: string
  atype: number
  membershipUuid: string
  organizationName: string
  organizationPrivateKey: string | null
  organizationPublicKey: string | null
  organizationUuid: string
  resetPasswordKey: string | null
  status: number
}

function adminUserOrganizationsFind(
  database: DatabaseConnection,
  userUuid: string,
  config: IdentityConfig,
): Result<Record<string, unknown>[]> {
  const op = "adminUserOrganizationsFind"
  try {
    const memberships: AdminUserOrganizationRow[] = database.drizzle
      .select({
        accessAll: usersOrganizations.accessAll,
        akey: usersOrganizations.akey,
        atype: usersOrganizations.atype,
        membershipUuid: usersOrganizations.uuid,
        organizationName: organizations.name,
        organizationPrivateKey: organizations.privateKey,
        organizationPublicKey: organizations.publicKey,
        organizationUuid: usersOrganizations.orgUuid,
        resetPasswordKey: usersOrganizations.resetPasswordKey,
        status: usersOrganizations.status,
      })
      .from(usersOrganizations)
      .innerJoin(organizations, eq(organizations.uuid, usersOrganizations.orgUuid))
      .where(and(eq(usersOrganizations.userUuid, userUuid), eq(usersOrganizations.status, 2)))
      .orderBy(usersOrganizations.orgUuid)
      .all()
    return resultCreate(memberships.map((membership) => adminUserOrganizationJsonCreate(membership, userUuid, config)))
  } catch {
    return resultErrorCreate(op, "User organization lookup failed.", { code: "platform.internal" })
  }
}

function adminUserOrganizationJsonCreate(
  membership: AdminUserOrganizationRow,
  userUuid: string,
  config: IdentityConfig,
): Record<string, unknown> {
  const type = membership.atype === 3 ? 4 : membership.atype
  const customWithAllAccess = type === 4 && membership.accessAll
  return {
    id: membership.organizationUuid,
    identifier: null,
    name: membership.organizationName,
    seats: 20,
    maxCollections: null,
    usersGetPremium: true,
    use2fa: true,
    useDirectory: false,
    useEvents: false,
    useGroups: false,
    useTotp: true,
    useScim: false,
    usePolicies: true,
    useApi: true,
    selfHost: true,
    hasPublicAndPrivateKeys: membership.organizationPrivateKey !== null && membership.organizationPublicKey !== null,
    resetPasswordEnrolled: membership.resetPasswordKey !== null,
    useResetPassword: config.MAIL_ENABLED,
    ssoBound: false,
    useSso: false,
    useKeyConnector: false,
    useSecretsManager: false,
    usePasswordManager: true,
    useCustomPermissions: true,
    useActivateAutofillPolicy: false,
    useAdminSponsoredFamilies: false,
    useRiskInsights: false,
    useDisableSMAdsForUsers: true,
    useInviteLinks: false,
    useMyItems: false,
    useOrganizationDomains: false,
    usePam: false,
    usePhishingBlocker: false,
    organizationUserId: membership.membershipUuid,
    providerId: null,
    providerName: null,
    providerType: null,
    familySponsorshipFriendlyName: null,
    familySponsorshipAvailable: false,
    productTierType: 3,
    keyConnectorEnabled: false,
    keyConnectorUrl: null,
    familySponsorshipLastSyncDate: null,
    familySponsorshipValidUntil: null,
    familySponsorshipToDelete: null,
    accessSecretsManager: false,
    limitCollectionCreation: membership.atype < 3 || !membership.accessAll,
    limitCollectionDeletion: true,
    limitItemDeletion: false,
    allowAdminAccessToAllCollectionItems: true,
    userIsManagedByOrganization: false,
    userIsClaimedByOrganization: false,
    permissions: {
      accessEventLogs: false,
      accessImportExport: false,
      accessReports: false,
      createNewCollections: customWithAllAccess,
      editAnyCollection: customWithAllAccess,
      deleteAnyCollection: customWithAllAccess,
      manageGroups: false,
      managePolicies: false,
      manageSso: false,
      manageUsers: false,
      manageResetPassword: false,
      manageScim: false,
    },
    maxStorageGb: 32_767,
    userId: userUuid,
    key: membership.akey,
    status: membership.status,
    type,
    enabled: true,
    object: "profileOrganization",
  }
}

function adminTwoFactorEnabledFind(database: DatabaseConnection, userUuid: string): boolean {
  try {
    return (
      (database.drizzle
        .select({ count: count() })
        .from(twoFactor)
        .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.enabled, true)))
        .get()?.count ?? 0) > 0
    )
  } catch {
    return false
  }
}

function adminDateFormat(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const iso = date.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`
}
