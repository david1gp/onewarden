import type { OrganizationCollection } from "./organizationCollection.js"
import type { OrganizationCollectionGroupAccess } from "./organizationCollectionGroupAccess.js"
import { organizationCollectionToJson } from "./organizationCollectionToJson.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export function organizationCollectionAccessDetailsToJson(
  collection: OrganizationCollection,
  membership: OrganizationMembership,
  callerAccess: { hidePasswords: boolean; manage: boolean; readOnly: boolean } | null,
  assigned: boolean,
  users: readonly OrganizationCollectionUserAccessDetail[],
  groups: readonly OrganizationCollectionGroupAccess[],
  manageAllMemberships: readonly string[],
) {
  const permissions = organizationCollectionPermissionsFromAccess(membership, callerAccess)
  const userAccess = users.map((access) => ({
    hidePasswords: access.hidePasswords,
    id: access.membershipUuid,
    manage:
      access.membershipType <= 1 ||
      access.manage ||
      (access.membershipType === 3 && !access.readOnly && !access.hidePasswords),
    readOnly: access.readOnly,
  }))
  userAccess.push(
    ...manageAllMemberships.map((membershipUuid) => ({
      hidePasswords: false,
      id: membershipUuid,
      manage: true,
      readOnly: false,
    })),
  )
  return {
    ...organizationCollectionToJson(collection),
    assigned,
    groups: groups.map((group) => ({
      hidePasswords: group.hidePasswords,
      id: group.groupUuid,
      manage: group.manage || (!group.readOnly && !group.hidePasswords),
      readOnly: group.readOnly,
    })),
    hidePasswords: permissions.hidePasswords,
    manage: permissions.manage,
    object: "collectionAccessDetails" as const,
    readOnly: permissions.readOnly,
    unmanaged: false,
    users: userAccess,
  }
}

type OrganizationCollectionUserAccessDetail = {
  hidePasswords: boolean
  manage: boolean
  membershipType: number
  membershipUuid: string
  readOnly: boolean
}

function organizationCollectionPermissionsFromAccess(
  membership: OrganizationMembership,
  access: { hidePasswords: boolean; manage: boolean; readOnly: boolean } | null,
): { hidePasswords: boolean; manage: boolean; readOnly: boolean } {
  if (organizationCollectionHasFullAccess(membership))
    return { hidePasswords: false, manage: membership.type >= 3, readOnly: false }
  if (access === null) return { hidePasswords: true, manage: false, readOnly: true }
  return {
    hidePasswords: access.hidePasswords,
    manage: membership.type === 3 && (access.manage || (!access.readOnly && !access.hidePasswords)),
    readOnly: access.readOnly,
  }
}

function organizationCollectionHasFullAccess(membership: OrganizationMembership): boolean {
  return membership.accessAll || membership.type <= 1
}
