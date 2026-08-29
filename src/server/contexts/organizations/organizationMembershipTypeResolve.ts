import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationMembershipTypeResolve(
  value: number | string,
  permissions: Record<string, unknown> | undefined,
): Result<{ accessAll: boolean; type: number }> {
  const rawType = typeof value === "number" ? String(value) : value
  const type =
    rawType === "0" || rawType === "Owner"
      ? organizationMembershipType.owner
      : rawType === "1" || rawType === "Admin"
        ? organizationMembershipType.admin
        : rawType === "2" || rawType === "User"
          ? organizationMembershipType.user
          : rawType === "3" || rawType === "Manager"
            ? organizationMembershipType.manager
            : rawType === "4" || rawType === "Custom"
              ? organizationMembershipType.manager
              : undefined
  if (type === undefined) return organizationErrorCreate("organizationMembershipTypeResolve", "Invalid type")

  const isCustom = rawType === "4" || rawType === "Custom"
  const customAccessAll =
    isCustom &&
    permissions !== undefined &&
    permissions.editAnyCollection === true &&
    permissions.deleteAnyCollection === true &&
    permissions.createNewCollections === true
  return resultCreate({
    accessAll:
      type === organizationMembershipType.owner || type === organizationMembershipType.admin || customAccessAll,
    type,
  })
}
