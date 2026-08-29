import { createMemo, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationPolicy } from "../schemas/organizationPolicySchema.js"
import { organizationPolicyNameResolve } from "../api/organizationPolicyNameResolve.js"
import { organizationPolicyDescriptionResolve } from "../api/organizationPolicyDescriptionResolve.js"

export interface OrganizationPolicyListProps {
  onEditPolicy: (policy: OrganizationPolicy) => void
  onTogglePolicy: (policy: OrganizationPolicy, enabled: boolean) => Promise<boolean>
  policies: Accessor<OrganizationPolicy[]>
}

export function organizationPolicyListStateCreate(props: OrganizationPolicyListProps) {
  const searchQuerySignal = createSignalObject("")

  const filteredPolicies = createMemo(() => {
    const list = props.policies()
    const query = searchQuerySignal.get().trim().toLowerCase()
    if (!query) return list
    return list.filter((pol) => {
      const name = organizationPolicyNameResolve(pol.type).toLowerCase()
      const desc = organizationPolicyDescriptionResolve(pol.type).toLowerCase()
      return name.includes(query) || desc.includes(query)
    })
  })

  const handleEdit = (policy: OrganizationPolicy) => {
    props.onEditPolicy(policy)
  }

  const handleToggle = async (policy: OrganizationPolicy) => {
    await props.onTogglePolicy(policy, !policy.enabled)
  }

  const handleSearchChange = (val: string) => {
    searchQuerySignal.set(val)
  }

  return {
    filteredPolicies,
    getPolicyDescription: organizationPolicyDescriptionResolve,
    getPolicyName: organizationPolicyNameResolve,
    handleEdit,
    handleSearchChange,
    handleToggle,
    searchQuery: searchQuerySignal.get,
  }
}
