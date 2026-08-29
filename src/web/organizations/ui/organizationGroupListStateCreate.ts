import { createMemo, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationGroup } from "../schemas/organizationGroupSchema.js"

export interface OrganizationGroupListProps {
  groups: Accessor<OrganizationGroup[]>
  onCreateClick: () => void
  onSelectGroup: (groupId: string) => void
  selectedGroupId: Accessor<string | null>
}

export function organizationGroupListStateCreate(props: OrganizationGroupListProps) {
  const searchQuerySignal = createSignalObject("")

  const filteredGroups = createMemo(() => {
    const list = props.groups()
    const query = searchQuerySignal.get().trim().toLowerCase()
    if (!query) return list
    return list.filter(
      (grp) => grp.name.toLowerCase().includes(query) || Boolean(grp.externalId?.toLowerCase().includes(query)),
    )
  })

  const isSelected = (groupId: string) => props.selectedGroupId() === groupId

  const handleGroupClick = (groupId: string) => {
    props.onSelectGroup(groupId)
  }

  const handleSearchChange = (val: string) => {
    searchQuerySignal.set(val)
  }

  return {
    filteredGroups,
    handleGroupClick,
    handleSearchChange,
    isSelected,
    onCreateClick: props.onCreateClick,
    searchQuery: searchQuerySignal.get,
  }
}
