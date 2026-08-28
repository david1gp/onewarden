import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserProfileToJson } from "../identity/identityUserProfileToJson.js"

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
      const row = database
        .query<{ updated_at: string | null }, [string]>(
          "SELECT MAX(updated_at) AS updated_at FROM devices WHERE user_uuid = ?",
        )
        .get(user.uuid)
      lastActive = row?.updated_at === null || row?.updated_at === undefined ? null : adminDateFormat(row.updated_at)
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
  membership_uuid: string
  organization_uuid: string
  organization_name: string
  organization_private_key: string | null
  organization_public_key: string | null
  access_all: number
  status: number
  atype: number
  reset_password_key: string | null
  akey: string
}

function adminUserOrganizationsFind(
  database: DatabaseConnection,
  userUuid: string,
  config: IdentityConfig,
): Result<Record<string, unknown>[]> {
  const op = "adminUserOrganizationsFind"
  try {
    const memberships = database
      .query<AdminUserOrganizationRow, [string]>(
        `SELECT member.uuid AS membership_uuid, member.org_uuid AS organization_uuid,
                organization.name AS organization_name, organization.private_key AS organization_private_key,
                organization.public_key AS organization_public_key, member.access_all, member.status,
                member.atype, member.reset_password_key, member.akey
         FROM users_organizations AS member
         JOIN organizations AS organization ON organization.uuid = member.org_uuid
         WHERE member.user_uuid = ? AND member.status = 2
         ORDER BY member.org_uuid`,
      )
      .all(userUuid)
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
  const customWithAllAccess = type === 4 && membership.access_all === 1
  return {
    id: membership.organization_uuid,
    identifier: null,
    name: membership.organization_name,
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
    hasPublicAndPrivateKeys:
      membership.organization_private_key !== null && membership.organization_public_key !== null,
    resetPasswordEnrolled: membership.reset_password_key !== null,
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
    organizationUserId: membership.membership_uuid,
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
    limitCollectionCreation: membership.atype < 3 || membership.access_all !== 1,
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
      (database
        .query<{ count: number }, [string]>(
          "SELECT COUNT(*) AS count FROM twofactor WHERE user_uuid = ? AND enabled = 1",
        )
        .get(userUuid)?.count ?? 0) > 0
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
