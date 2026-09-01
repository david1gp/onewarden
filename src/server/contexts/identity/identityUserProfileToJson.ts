import type { DatabaseConnection } from "../../database/database.js"
import { organizations } from "../../database/schema/organizations.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityUser } from "./identityUser.js"
import { and, asc, eq } from "drizzle-orm"

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
  accessAll: boolean
  akey: string
  membershipUuid: string
  organizationIdentifier: string | null
  organizationName: string
  organizationPrivateKey: string | null
  organizationPublicKey: string | null
  organizationUuid: string
  resetPasswordKey: string | null
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
    const memberships = database.drizzle
      .select({
        membershipUuid: usersOrganizations.uuid,
        organizationUuid: usersOrganizations.orgUuid,
        organizationName: organizations.name,
        organizationIdentifier: organizations.identifier,
        organizationPrivateKey: organizations.privateKey,
        organizationPublicKey: organizations.publicKey,
        accessAll: usersOrganizations.accessAll,
        status: usersOrganizations.status,
        atype: usersOrganizations.atype,
        resetPasswordKey: usersOrganizations.resetPasswordKey,
        akey: usersOrganizations.akey,
      })
      .from(usersOrganizations)
      .innerJoin(organizations, eq(organizations.uuid, usersOrganizations.orgUuid))
      .where(and(eq(usersOrganizations.userUuid, userUuid), eq(usersOrganizations.status, 2)))
      .orderBy(asc(usersOrganizations.orgUuid))
      .all()
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
  const customWithAllAccess = type === 4 && membership.accessAll
  return {
    id: membership.organizationUuid,
    identifier: membership.organizationIdentifier,
    name: membership.organizationName,
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
    hasPublicAndPrivateKeys: membership.organizationPrivateKey !== null && membership.organizationPublicKey !== null,
    resetPasswordEnrolled: membership.resetPasswordKey !== null,
    useResetPassword: config.MAIL_ENABLED,
    ssoBound: false,
    useSso: true,
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
    useOrganizationDomains: true,
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

function identityUserProfileTwoFactorEnabled(database: DatabaseConnection, userUuid: string): boolean {
  try {
    return (
      database.drizzle
        .select({ uuid: twoFactor.uuid })
        .from(twoFactor)
        .where(and(eq(twoFactor.userUuid, userUuid), eq(twoFactor.enabled, true)))
        .limit(1)
        .get() !== undefined
    )
  } catch {
    return false
  }
}
