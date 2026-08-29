import type { IdentityUser } from "../identity/identityUser.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationMembershipUserDetailsToJson(
  membership: OrganizationMembership,
  user: IdentityUser,
  collections: ReadonlyArray<{ hidePasswords: boolean; id: string; manage: boolean; readOnly: boolean }>,
  groups: readonly string[],
  twoFactorEnabled: boolean,
): Record<string, unknown> {
  const type = membership.type === organizationMembershipType.manager ? 4 : membership.type
  const customWithAllAccess = type === 4 && membership.accessAll
  const status =
    membership.status < organizationMembershipStatus.revoked ? organizationMembershipStatus.revoked : membership.status
  const unrevokedStatus =
    membership.status < organizationMembershipStatus.revoked ? membership.status + 128 : membership.status
  const normalizedCollections = collections.map((collection) => ({
    hidePasswords:
      membership.type === organizationMembershipType.owner || membership.type === organizationMembershipType.admin
        ? false
        : collection.hidePasswords,
    id: collection.id,
    manage:
      membership.type === organizationMembershipType.owner ||
      membership.type === organizationMembershipType.admin ||
      collection.manage ||
      (membership.type === organizationMembershipType.manager && !collection.readOnly && !collection.hidePasswords),
    readOnly:
      membership.type === organizationMembershipType.owner || membership.type === organizationMembershipType.admin
        ? false
        : collection.readOnly,
  }))

  return {
    accessAll: membership.accessAll,
    accessSecretsManager: false,
    avatarColor: user.avatarColor,
    claimedByOrganization: false,
    collections: normalizedCollections,
    email: user.email,
    externalId: membership.externalId,
    groups,
    hasMasterPassword: user.passwordHash.byteLength > 0,
    id: membership.uuid,
    managedByOrganization: false,
    name: unrevokedStatus >= organizationMembershipStatus.accepted ? user.name : null,
    object: "organizationUserUserDetails",
    permissions: customWithAllAccess
      ? {
          accessEventLogs: false,
          accessImportExport: false,
          accessReports: false,
          createNewCollections: true,
          deleteAnyCollection: true,
          editAnyCollection: true,
          manageGroups: false,
          managePolicies: false,
          manageResetPassword: false,
          manageScim: false,
          manageSso: false,
          manageUsers: false,
        }
      : null,
    resetPasswordEnrolled: membership.resetPasswordKey !== null,
    ssoBound: false,
    status,
    twoFactorEnabled,
    type,
    usesKeyConnector: false,
    userId: membership.userUuid,
  }
}
