import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserProfileToJson(
  user: IdentityUser,
  config: IdentityConfig,
  database?: DatabaseConnection,
  groupsEnabled = false,
) {
  const accountKeys =
    user.privateKey === null
      ? null
      : {
          publicKeyEncryptionKeyPair: {
            wrappedPrivateKey: user.privateKey,
            publicKey: user.publicKey,
            signedPublicKey: null,
            object: "publicKeyEncryptionKeyPair" as const,
          },
          securityState: null,
          signatureKeyPair: null,
          object: "privateKeys" as const,
        }
  return {
    _status: user.passwordHash.byteLength === 0 ? 1 : 0,
    accountKeys,
    id: user.uuid,
    name: user.name,
    email: user.email,
    emailVerified: !config.MAIL_ENABLED || user.verifiedAt !== null,
    premium: true,
    premiumFromOrganization: false,
    culture: "en-US",
    twoFactorEnabled: database === undefined ? false : identityUserProfileTwoFactorEnabled(database, user.uuid),
    key: user.akey,
    privateKey: user.privateKey,
    securityStamp: user.securityStamp,
    organizations:
      database === undefined ? [] : identityUserProfileOrganizations(database, user.uuid, config, groupsEnabled),
    providers: [],
    providerOrganizations: [],
    forcePasswordReset: false,
    avatarColor: user.avatarColor,
    usesKeyConnector: false,
    creationDate: user.createdAt,
    object: "profile" as const,
  }
}

type IdentityUserProfileOrganizationRow = {
  access_all: number
  akey: string
  membership_uuid: string
  organization_name: string
  organization_private_key: string | null
  organization_public_key: string | null
  organization_uuid: string
  reset_password_key: string | null
  status: number
  atype: number
}

function identityUserProfileOrganizations(
  database: DatabaseConnection,
  userUuid: string,
  config: IdentityConfig,
  groupsEnabled: boolean,
): Record<string, unknown>[] {
  try {
    const memberships = database
      .query<IdentityUserProfileOrganizationRow, [string]>(
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
    return memberships.map((membership) =>
      identityUserProfileOrganizationToJson(membership, userUuid, config, groupsEnabled),
    )
  } catch {
    return []
  }
}

function identityUserProfileOrganizationToJson(
  membership: IdentityUserProfileOrganizationRow,
  userUuid: string,
  config: IdentityConfig,
  groupsEnabled: boolean,
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
    useGroups: groupsEnabled,
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

function identityUserProfileTwoFactorEnabled(database: DatabaseConnection, userUuid: string): boolean {
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
