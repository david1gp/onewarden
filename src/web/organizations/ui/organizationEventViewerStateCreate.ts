import { createMemo, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationEvent } from "../schemas/organizationEventSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import { organizationEventNameResolve } from "../api/organizationEventNameResolve.js"

export interface OrganizationEventViewerProps {
  continuationToken?: Accessor<string | null>
  events: Accessor<OrganizationEvent[]>
  isLoading?: Accessor<boolean>
  members: Accessor<OrganizationMember[]>
  onFilterChange?: (filter: { memberId?: string; type?: number }) => void
  onLoadMore?: () => void
  onRefresh?: () => void
}

export function organizationEventViewerStateCreate(props: OrganizationEventViewerProps) {
  const searchQuerySignal = createSignalObject("")
  const selectedMemberFilterSignal = createSignalObject<string>("all")
  const selectedTypeFilterSignal = createSignalObject<string>("all")

  const filteredEvents = createMemo(() => {
    let list = props.events()
    const memberFilter = selectedMemberFilterSignal.get()
    const typeFilter = selectedTypeFilterSignal.get()
    const query = searchQuerySignal.get().trim().toLowerCase()

    if (memberFilter !== "all") {
      list = list.filter(
        (e) => e.actingUserId === memberFilter || e.userId === memberFilter || e.organizationUserId === memberFilter,
      )
    }

    if (typeFilter !== "all") {
      const typeNum = Number(typeFilter)
      list = list.filter((e) => e.type === typeNum)
    }

    if (query) {
      list = list.filter((e) => {
        const name = organizationEventNameResolve(e.type).toLowerCase()
        const ip = e.ipAddress?.toLowerCase() ?? ""
        const actor = e.actingUserId?.toLowerCase() ?? ""
        return name.includes(query) || ip.includes(query) || actor.includes(query)
      })
    }

    return list
  })

  const resolveMemberName = (userIdOrMemberId: string | null | undefined): string => {
    if (!userIdOrMemberId) return "System"
    const members = props.members()
    const found = members.find((m) => m.id === userIdOrMemberId || m.userId === userIdOrMemberId)
    return found?.name || found?.email || userIdOrMemberId
  }

  const resolveDeviceName = (deviceType: number | null | undefined): string => {
    switch (deviceType) {
      case 0:
        return "Android"
      case 1:
        return "iOS"
      case 2:
        return "Chrome"
      case 3:
        return "Firefox"
      case 4:
        return "Opera"
      case 5:
        return "Edge"
      case 6:
        return "Windows"
      case 7:
        return "macOS"
      case 8:
        return "Linux"
      case 9:
        return "Safari"
      case 14:
        return "Web Vault"
      default:
        return "App / Client"
    }
  }

  const formatEventDate = (isoString: string): string => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "medium",
      })
    } catch {
      return isoString
    }
  }

  const handleMemberFilterChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value
    selectedMemberFilterSignal.set(val)
    if (props.onFilterChange) {
      props.onFilterChange({
        memberId: val === "all" ? undefined : val,
        type: selectedTypeFilterSignal.get() === "all" ? undefined : Number(selectedTypeFilterSignal.get()),
      })
    }
  }

  const handleTypeFilterChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value
    selectedTypeFilterSignal.set(val)
    if (props.onFilterChange) {
      props.onFilterChange({
        memberId: selectedMemberFilterSignal.get() === "all" ? undefined : selectedMemberFilterSignal.get(),
        type: val === "all" ? undefined : Number(val),
      })
    }
  }

  const handleSearchChange = (val: string) => {
    searchQuerySignal.set(val)
  }

  return {
    continuationToken: props.continuationToken ?? (() => null),
    filteredEvents,
    formatEventDate,
    getEventName: organizationEventNameResolve,
    handleMemberFilterChange,
    handleSearchChange,
    handleTypeFilterChange,
    isLoading: props.isLoading ?? (() => false),
    members: props.members,
    onLoadMore: props.onLoadMore,
    onRefresh: props.onRefresh,
    resolveDeviceName,
    resolveMemberName,
    searchQuery: searchQuerySignal.get,
    selectedMemberFilter: selectedMemberFilterSignal.get,
    selectedTypeFilter: selectedTypeFilterSignal.get,
  }
}
