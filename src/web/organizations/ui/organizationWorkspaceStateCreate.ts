import { createEffect, createMemo, onMount } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { organizationApiClientCreate, type OrganizationApiClientOptions } from "../api/organizationApiClientCreate.js"
import { organizationDemoData } from "../demo/organizationDemoData.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"
import type { OrganizationCollectionInput } from "../schemas/organizationCollectionInputSchema.js"
import type { OrganizationCreateInput } from "../schemas/organizationCreateInputSchema.js"
import type { OrganizationDomain } from "../schemas/organizationDomainSchema.js"
import type { OrganizationDomainInput } from "../schemas/organizationDomainInputSchema.js"
import type { OrganizationEvent } from "../schemas/organizationEventSchema.js"
import type { OrganizationGroup } from "../schemas/organizationGroupSchema.js"
import type { OrganizationGroupInput } from "../schemas/organizationGroupInputSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationMemberInviteInput } from "../schemas/organizationMemberInviteInputSchema.js"
import type { OrganizationMemberUpdateInput } from "../schemas/organizationMemberUpdateInputSchema.js"
import type { OrganizationPolicy } from "../schemas/organizationPolicySchema.js"
import type { OrganizationPolicyInput } from "../schemas/organizationPolicyInputSchema.js"
import type { Organization } from "../schemas/organizationSchema.js"
import type { OrganizationSso } from "../schemas/organizationSsoSchema.js"
import type { OrganizationSsoInput } from "../schemas/organizationSsoInputSchema.js"
import type { OrganizationUpdateInput } from "../schemas/organizationUpdateInputSchema.js"
import { organizationWorkspaceDialogSchema } from "../schemas/organizationWorkspaceDialogSchema.js"
import { organizationWorkspaceIdentifierSchema } from "../schemas/organizationWorkspaceIdentifierSchema.js"
import { type OrganizationWorkspaceTab, organizationWorkspaceTabSchema } from "../schemas/organizationWorkspaceTab.js"

export interface OrganizationWorkspaceProps {
  apiClientOptions?: OrganizationApiClientOptions
  initialOrgId?: string
  initialTab?: OrganizationWorkspaceTab
  useDemoFallback?: boolean
  pathname?: () => string
  search?: () => string
  hash?: () => string
  navigateReplace?: (path: string) => void
}

export function organizationWorkspaceStateCreate(props: OrganizationWorkspaceProps = {}) {
  const apiClient = organizationApiClientCreate(props.apiClientOptions)
  const useDemoFallback = props.useDemoFallback ?? true
  const pathname =
    props.pathname ?? (() => (typeof window === "undefined" ? "/organizations" : window.location.pathname))
  const search = props.search ?? (() => (typeof window === "undefined" ? "" : window.location.search))
  const hash = props.hash ?? (() => (typeof window === "undefined" ? "" : window.location.hash))

  // Signals
  const organizationsSignal = createSignalObject<Organization[]>(
    useDemoFallback ? organizationDemoData.organizations : [],
  )
  const activeOrgIdSignal = createSignalObject<string | null>(
    props.initialOrgId ?? (useDemoFallback ? organizationDemoData.organizations[0]?.id : null) ?? null,
  )
  const activeTabSignal = createSignalObject<OrganizationWorkspaceTab>(props.initialTab ?? "members")
  const membersSignal = createSignalObject<OrganizationMember[]>(useDemoFallback ? organizationDemoData.members : [])
  const selectedMemberIdSignal = createSignalObject<string | null>(
    useDemoFallback ? (organizationDemoData.members[0]?.id ?? null) : null,
  )
  const collectionsSignal = createSignalObject<OrganizationCollection[]>(
    useDemoFallback ? organizationDemoData.collections : [],
  )
  const selectedCollectionIdSignal = createSignalObject<string | null>(
    useDemoFallback ? (organizationDemoData.collections[0]?.id ?? null) : null,
  )

  // Groups
  const groupsSignal = createSignalObject<OrganizationGroup[]>(useDemoFallback ? organizationDemoData.groups : [])
  const selectedGroupIdSignal = createSignalObject<string | null>(
    useDemoFallback ? (organizationDemoData.groups[0]?.id ?? null) : null,
  )

  // Policies
  const policiesSignal = createSignalObject<OrganizationPolicy[]>(useDemoFallback ? organizationDemoData.policies : [])

  // Events
  const eventsSignal = createSignalObject<OrganizationEvent[]>(useDemoFallback ? organizationDemoData.events : [])
  const eventContinuationTokenSignal = createSignalObject<string | null>(null)
  const eventFiltersSignal = createSignalObject<{ memberId?: string; type?: number }>({})

  // Domains
  const domainsSignal = createSignalObject<OrganizationDomain[]>(useDemoFallback ? organizationDemoData.domains : [])

  // SSO
  const ssoSignal = createSignalObject<OrganizationSso | null>(useDemoFallback ? organizationDemoData.sso : null)

  // Mobile View Switcher
  const activeMobilePaneSignal = createSignalObject<"list" | "detail">("list")

  // Dialogs
  const isCreateOrgOpenSignal = createSignalObject(false)
  const isInviteMemberOpenSignal = createSignalObject(false)
  const isEditMemberOpenSignal = createSignalObject(false)
  const editingMemberSignal = createSignalObject<OrganizationMember | null>(null)
  const isCreateCollectionOpenSignal = createSignalObject(false)
  const isEditCollectionOpenSignal = createSignalObject(false)
  const editingCollectionSignal = createSignalObject<OrganizationCollection | null>(null)

  const isCreateGroupOpenSignal = createSignalObject(false)
  const isEditGroupOpenSignal = createSignalObject(false)
  const editingGroupSignal = createSignalObject<OrganizationGroup | null>(null)

  const isEditPolicyOpenSignal = createSignalObject(false)
  const editingPolicySignal = createSignalObject<OrganizationPolicy | null>(null)

  const isCreateDomainOpenSignal = createSignalObject(false)

  // Loading & error
  const isLoadingSignal = createSignalObject(false)
  const notificationSignal = createSignalObject<{ error: boolean; message: string } | null>(null)

  const activeOrg = createMemo(() => {
    const orgId = activeOrgIdSignal.get()
    if (!orgId) return organizationsSignal.get()[0] ?? null
    return organizationsSignal.get().find((o) => o.id === orgId) ?? organizationsSignal.get()[0] ?? null
  })

  const selectedMember = createMemo(() => {
    const memberId = selectedMemberIdSignal.get()
    if (!memberId) return membersSignal.get()[0] ?? null
    return membersSignal.get().find((m) => m.id === memberId) ?? null
  })

  const selectedCollection = createMemo(() => {
    const colId = selectedCollectionIdSignal.get()
    if (!colId) return collectionsSignal.get()[0] ?? null
    return collectionsSignal.get().find((c) => c.id === colId) ?? null
  })

  const selectedGroup = createMemo(() => {
    const grpId = selectedGroupIdSignal.get()
    if (!grpId) return groupsSignal.get()[0] ?? null
    return groupsSignal.get().find((g) => g.id === grpId) ?? null
  })

  const organizationDataClear = () => {
    membersSignal.set([])
    selectedMemberIdSignal.set(null)
    collectionsSignal.set([])
    selectedCollectionIdSignal.set(null)
    groupsSignal.set([])
    selectedGroupIdSignal.set(null)
    policiesSignal.set([])
    eventsSignal.set([])
    eventContinuationTokenSignal.set(null)
    domainsSignal.set([])
    ssoSignal.set(null)
  }

  // URL Sync
  const syncFromUrl = () => {
    const params = new URLSearchParams(search())
    const tabResult = v.safeParse(organizationWorkspaceTabSchema, params.get("tab"))
    activeTabSignal.set(tabResult.success ? tabResult.output : (props.initialTab ?? "members"))

    const orgResult = v.safeParse(organizationWorkspaceIdentifierSchema, params.get("orgId"))
    if (orgResult.success) activeOrgIdSignal.set(orgResult.output)
    const memberResult = v.safeParse(organizationWorkspaceIdentifierSchema, params.get("memberId"))
    if (memberResult.success) selectedMemberIdSignal.set(memberResult.output)
    const collectionResult = v.safeParse(organizationWorkspaceIdentifierSchema, params.get("collectionId"))
    if (collectionResult.success) selectedCollectionIdSignal.set(collectionResult.output)
    const groupResult = v.safeParse(organizationWorkspaceIdentifierSchema, params.get("groupId"))
    if (groupResult.success) selectedGroupIdSignal.set(groupResult.output)

    const dialogResult = v.safeParse(organizationWorkspaceDialogSchema, params.get("dialog"))
    isCreateOrgOpenSignal.set(false)
    isInviteMemberOpenSignal.set(false)
    isCreateCollectionOpenSignal.set(false)
    isCreateGroupOpenSignal.set(false)
    isCreateDomainOpenSignal.set(false)
    if (!dialogResult.success) return
    const dialogParam = dialogResult.output
    if (dialogParam === "create-org") isCreateOrgOpenSignal.set(true)
    if (dialogParam === "invite-member") isInviteMemberOpenSignal.set(true)
    if (dialogParam === "create-collection") isCreateCollectionOpenSignal.set(true)
    if (dialogParam === "create-group") isCreateGroupOpenSignal.set(true)
    if (dialogParam === "create-domain") isCreateDomainOpenSignal.set(true)
  }

  const updateUrl = () => {
    const url = new URL(
      `${pathname()}${search()}${hash()}`,
      typeof window === "undefined" ? "http://localhost" : window.location.origin,
    )
    const params = url.searchParams
    params.set("tab", activeTabSignal.get())
    const org = activeOrg()
    if (org) params.set("orgId", org.id)
    else params.delete("orgId")

    const selectedMemberId = selectedMemberIdSignal.get()
    if (activeTabSignal.get() === "members" && selectedMemberId) params.set("memberId", selectedMemberId)
    else params.delete("memberId")

    const selectedCollectionId = selectedCollectionIdSignal.get()
    if (activeTabSignal.get() === "collections" && selectedCollectionId) {
      params.set("collectionId", selectedCollectionId)
    } else params.delete("collectionId")

    const selectedGroupId = selectedGroupIdSignal.get()
    if (activeTabSignal.get() === "groups" && selectedGroupId) params.set("groupId", selectedGroupId)
    else params.delete("groupId")

    if (isCreateOrgOpenSignal.get()) params.set("dialog", "create-org")
    else if (isInviteMemberOpenSignal.get()) params.set("dialog", "invite-member")
    else if (isCreateCollectionOpenSignal.get()) params.set("dialog", "create-collection")
    else if (isCreateGroupOpenSignal.get()) params.set("dialog", "create-group")
    else if (isCreateDomainOpenSignal.get()) params.set("dialog", "create-domain")
    else params.delete("dialog")

    const newUrl = `${url.pathname}?${params.toString()}${url.hash}`
    props.navigateReplace?.(newUrl)
  }

  // Data Refresh
  const refreshData = async () => {
    const org = activeOrg()
    if (!org) return
    isLoadingSignal.set(true)
    try {
      const [membersRes, collectionsRes, groupsRes, policiesRes, domainsRes, ssoRes] = await Promise.all([
        apiClient.organizationMemberList(org.id),
        apiClient.organizationCollectionList(org.id),
        apiClient.organizationGroupList(org.id),
        apiClient.organizationPolicyList(org.id),
        apiClient.organizationDomainList(org.id),
        apiClient.organizationSsoGet(org.id),
      ])

      if (membersRes.success) {
        membersSignal.set(membersRes.data)
        const selectedId = selectedMemberIdSignal.get()
        selectedMemberIdSignal.set(
          selectedId && membersRes.data.some((member) => member.id === selectedId)
            ? selectedId
            : (membersRes.data[0]?.id ?? null),
        )
      } else if (!useDemoFallback) {
        membersSignal.set([])
        selectedMemberIdSignal.set(null)
      }
      if (collectionsRes.success) {
        collectionsSignal.set(collectionsRes.data)
        const selectedId = selectedCollectionIdSignal.get()
        selectedCollectionIdSignal.set(
          selectedId && collectionsRes.data.some((collection) => collection.id === selectedId)
            ? selectedId
            : (collectionsRes.data[0]?.id ?? null),
        )
      } else if (!useDemoFallback) {
        collectionsSignal.set([])
        selectedCollectionIdSignal.set(null)
      }
      if (groupsRes.success) {
        groupsSignal.set(groupsRes.data)
        const selectedId = selectedGroupIdSignal.get()
        selectedGroupIdSignal.set(
          selectedId && groupsRes.data.some((group) => group.id === selectedId)
            ? selectedId
            : (groupsRes.data[0]?.id ?? null),
        )
      } else if (!useDemoFallback) {
        groupsSignal.set([])
        selectedGroupIdSignal.set(null)
      }
      if (policiesRes.success) {
        policiesSignal.set(policiesRes.data)
      } else if (!useDemoFallback) {
        policiesSignal.set([])
      }
      if (domainsRes.success) {
        domainsSignal.set(domainsRes.data)
      } else if (!useDemoFallback) {
        domainsSignal.set([])
      }
      if (ssoRes.success) {
        ssoSignal.set(ssoRes.data)
      } else if (!useDemoFallback) {
        ssoSignal.set(null)
      }

      const failedResult = [membersRes, collectionsRes, groupsRes, policiesRes, domainsRes, ssoRes].find(
        (result) => !result.success,
      )
      if (failedResult && !failedResult.success && !useDemoFallback) {
        notificationSignal.set({ error: true, message: failedResult.errorMessage })
      }

      await loadEvents(org.id)
    } finally {
      isLoadingSignal.set(false)
    }
  }

  const loadEvents = async (orgId: string, continuationToken?: string | null) => {
    const filters = eventFiltersSignal.get()
    const params = {
      continuationToken: continuationToken ?? undefined,
    }
    const eventsRes = filters.memberId
      ? await apiClient.organizationUserEventList(orgId, filters.memberId, params)
      : await apiClient.organizationEventList(orgId, params)

    if (eventsRes.success) {
      if (continuationToken) {
        eventsSignal.set([...eventsSignal.get(), ...eventsRes.data.data])
      } else {
        eventsSignal.set(eventsRes.data.data)
      }
      eventContinuationTokenSignal.set(eventsRes.data.continuationToken)
    } else if (!useDemoFallback) {
      if (!continuationToken) eventsSignal.set([])
      eventContinuationTokenSignal.set(null)
      notificationSignal.set({ error: true, message: eventsRes.errorMessage })
    }
  }

  const loadOrganizations = async () => {
    isLoadingSignal.set(true)
    try {
      const orgsRes = await apiClient.organizationList()
      if (orgsRes.success) {
        organizationsSignal.set(orgsRes.data)
        const selectedId = activeOrgIdSignal.get()
        activeOrgIdSignal.set(
          selectedId && orgsRes.data.some((organization) => organization.id === selectedId)
            ? selectedId
            : (orgsRes.data[0]?.id ?? null),
        )
        if (orgsRes.data.length === 0) {
          organizationDataClear()
          return
        }
      } else if (!useDemoFallback) {
        organizationsSignal.set([])
        activeOrgIdSignal.set(null)
        organizationDataClear()
        notificationSignal.set({ error: true, message: orgsRes.errorMessage })
        return
      }
      await refreshData()
    } finally {
      isLoadingSignal.set(false)
    }
  }

  syncFromUrl()
  createEffect(syncFromUrl)

  onMount(() => {
    void loadOrganizations()
  })

  // Tab & Org Handlers
  const handleSelectTab = (tab: OrganizationWorkspaceTab) => {
    activeTabSignal.set(tab)
    activeMobilePaneSignal.set("list")
    updateUrl()
  }

  const handleSelectOrg = (orgId: string) => {
    activeOrgIdSignal.set(orgId)
    activeMobilePaneSignal.set("list")
    if (!useDemoFallback) organizationDataClear()
    updateUrl()
    void refreshData()
  }

  const handleShowMobileList = () => {
    activeMobilePaneSignal.set("list")
  }

  // Member Handlers
  const handleSelectMember = (memberId: string) => {
    selectedMemberIdSignal.set(memberId)
    activeMobilePaneSignal.set("detail")
    updateUrl()
  }

  const handleOpenInviteMember = () => {
    isInviteMemberOpenSignal.set(true)
    updateUrl()
  }

  const handleCloseInviteMember = () => {
    isInviteMemberOpenSignal.set(false)
    updateUrl()
  }

  const handleInviteMembers = async (input: OrganizationMemberInviteInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationMemberInvite(org.id, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Member invitation(s) sent successfully." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to send invitation." })
    return false
  }

  const handleOpenEditMember = (member: OrganizationMember) => {
    editingMemberSignal.set(member)
    isEditMemberOpenSignal.set(true)
  }

  const handleCloseEditMember = () => {
    isEditMemberOpenSignal.set(false)
    editingMemberSignal.set(null)
  }

  const handleSaveMember = async (memberId: string, input: OrganizationMemberUpdateInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationMemberUpdate(org.id, memberId, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Member permissions updated." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to update member." })
    return false
  }

  const handleRemoveMember = async (memberId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationMemberRemove(org.id, memberId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Member removed from organization." })
      await refreshData()
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to remove member." })
    }
  }

  const handleRevokeMember = async (memberId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationMemberRevoke(org.id, memberId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Member access revoked." })
      await refreshData()
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to revoke member." })
    }
  }

  const handleRestoreMember = async (memberId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationMemberRestore(org.id, memberId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Member access restored." })
      await refreshData()
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to restore member." })
    }
  }

  const handleReinviteMember = async (memberId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationMemberReinvite(org.id, memberId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Invitation resent." })
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to resend invitation." })
    }
  }

  // Collection Handlers
  const handleSelectCollection = (collectionId: string) => {
    selectedCollectionIdSignal.set(collectionId)
    activeMobilePaneSignal.set("detail")
    updateUrl()
  }

  const handleOpenCreateCollection = () => {
    isCreateCollectionOpenSignal.set(true)
    updateUrl()
  }

  const handleCloseCreateCollection = () => {
    isCreateCollectionOpenSignal.set(false)
    updateUrl()
  }

  const handleCreateCollection = async (input: OrganizationCollectionInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationCollectionCreate(org.id, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Collection created successfully." })
      await refreshData()
      selectedCollectionIdSignal.set(res.data.id)
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to create collection." })
    return false
  }

  const handleOpenEditCollection = (collection: OrganizationCollection) => {
    editingCollectionSignal.set(collection)
    isEditCollectionOpenSignal.set(true)
  }

  const handleCloseEditCollection = () => {
    isEditCollectionOpenSignal.set(false)
    editingCollectionSignal.set(null)
  }

  const handleSaveCollection = async (collectionId: string, input: OrganizationCollectionInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationCollectionUpdate(org.id, collectionId, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Collection updated." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to update collection." })
    return false
  }

  const handleDeleteCollection = async (collectionId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationCollectionDelete(org.id, collectionId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Collection deleted." })
      await refreshData()
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to delete collection." })
    }
  }

  // Group Handlers
  const handleSelectGroup = (groupId: string) => {
    selectedGroupIdSignal.set(groupId)
    activeMobilePaneSignal.set("detail")
    updateUrl()
  }

  const handleOpenCreateGroup = () => {
    isCreateGroupOpenSignal.set(true)
    updateUrl()
  }

  const handleCloseCreateGroup = () => {
    isCreateGroupOpenSignal.set(false)
    updateUrl()
  }

  const handleCreateGroup = async (input: OrganizationGroupInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationGroupCreate(org.id, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Group created successfully." })
      await refreshData()
      selectedGroupIdSignal.set(res.data.id)
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to create group." })
    return false
  }

  const handleOpenEditGroup = (group: OrganizationGroup) => {
    editingGroupSignal.set(group)
    isEditGroupOpenSignal.set(true)
  }

  const handleCloseEditGroup = () => {
    isEditGroupOpenSignal.set(false)
    editingGroupSignal.set(null)
  }

  const handleSaveGroup = async (groupId: string, input: OrganizationGroupInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationGroupUpdate(org.id, groupId, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Group updated." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to update group." })
    return false
  }

  const handleDeleteGroup = async (groupId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationGroupDelete(org.id, groupId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Group deleted." })
      await refreshData()
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to delete group." })
    }
  }

  const handleRemoveGroupMember = async (groupId: string, memberId: string) => {
    const org = activeOrg()
    if (!org) return
    const res = await apiClient.organizationGroupMemberDelete(org.id, groupId, memberId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Member removed from group." })
      await refreshData()
    } else {
      notificationSignal.set({ error: true, message: res.errorMessage || "Failed to remove member from group." })
    }
  }

  // Policy Handlers
  const handleOpenEditPolicy = (policy: OrganizationPolicy) => {
    editingPolicySignal.set(policy)
    isEditPolicyOpenSignal.set(true)
  }

  const handleCloseEditPolicy = () => {
    isEditPolicyOpenSignal.set(false)
    editingPolicySignal.set(null)
  }

  const handleSavePolicy = async (policyType: number, input: OrganizationPolicyInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationPolicyUpdate(org.id, policyType, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Security policy updated." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to update policy." })
    return false
  }

  const handleTogglePolicy = async (policy: OrganizationPolicy, enabled: boolean): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationPolicyUpdate(org.id, policy.type, {
      data: policy.data,
      enabled,
    })
    if (res.success) {
      notificationSignal.set({
        error: false,
        message: enabled ? "Policy enabled successfully." : "Policy disabled successfully.",
      })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to update policy." })
    return false
  }

  // Event Handlers
  const handleRefreshEvents = async () => {
    const org = activeOrg()
    if (org) {
      isLoadingSignal.set(true)
      try {
        await loadEvents(org.id)
      } finally {
        isLoadingSignal.set(false)
      }
    }
  }

  const handleLoadMoreEvents = async () => {
    const org = activeOrg()
    const token = eventContinuationTokenSignal.get()
    if (org && token) {
      isLoadingSignal.set(true)
      try {
        await loadEvents(org.id, token)
      } finally {
        isLoadingSignal.set(false)
      }
    }
  }

  const handleFilterEvents = async (filter: { memberId?: string; type?: number }) => {
    eventFiltersSignal.set(filter)
    const org = activeOrg()
    if (org) {
      isLoadingSignal.set(true)
      try {
        await loadEvents(org.id)
      } finally {
        isLoadingSignal.set(false)
      }
    }
  }

  // Domain Handlers
  const handleOpenCreateDomain = () => {
    isCreateDomainOpenSignal.set(true)
    updateUrl()
  }

  const handleCloseCreateDomain = () => {
    isCreateDomainOpenSignal.set(false)
    updateUrl()
  }

  const handleCreateDomain = async (input: OrganizationDomainInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationDomainCreate(org.id, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Domain claimed successfully." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to claim domain." })
    return false
  }

  const handleVerifyDomain = async (domainId: string): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationDomainVerify(org.id, domainId)
    if (res.success) {
      if (res.data.verifiedDate) {
        notificationSignal.set({ error: false, message: "Domain verified successfully!" })
      } else {
        notificationSignal.set({
          error: true,
          message: "TXT record not found. Please check DNS configuration and try again.",
        })
      }
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Domain verification failed." })
    return false
  }

  const handleDeleteDomain = async (domainId: string): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationDomainDelete(org.id, domainId)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Domain removed." })
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to remove domain." })
    return false
  }

  // SSO Handler
  const handleSaveSso = async (input: OrganizationSsoInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationSsoSave(org.id, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "SSO configuration saved." })
      ssoSignal.set(res.data)
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to save SSO configuration." })
    return false
  }

  // Org Create & Update Handlers
  const handleOpenCreateOrg = () => {
    isCreateOrgOpenSignal.set(true)
    updateUrl()
  }

  const handleCloseCreateOrg = () => {
    isCreateOrgOpenSignal.set(false)
    updateUrl()
  }

  const handleCreateOrg = async (input: OrganizationCreateInput): Promise<boolean> => {
    const res = await apiClient.organizationCreate(input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Organization created successfully." })
      const nextOrgs = [...organizationsSignal.get(), res.data]
      organizationsSignal.set(nextOrgs)
      activeOrgIdSignal.set(res.data.id)
      await refreshData()
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to create organization." })
    return false
  }

  const handleUpdateOrg = async (input: OrganizationUpdateInput): Promise<boolean> => {
    const org = activeOrg()
    if (!org) return false
    const res = await apiClient.organizationUpdate(org.id, input)
    if (res.success) {
      notificationSignal.set({ error: false, message: "Organization updated successfully." })
      const nextOrgs = organizationsSignal.get().map((o) => (o.id === org.id ? { ...o, ...res.data } : o))
      organizationsSignal.set(nextOrgs)
      return true
    }
    notificationSignal.set({ error: true, message: res.errorMessage || "Failed to update organization." })
    return false
  }

  return {
    activeMobilePane: activeMobilePaneSignal.get,
    activeOrg,
    activeTab: activeTabSignal.get,
    collectionCount: () => collectionsSignal.get().length,
    collections: collectionsSignal.get,
    domainCount: () => domainsSignal.get().length,
    domains: domainsSignal.get,
    editingCollection: editingCollectionSignal.get,
    editingGroup: editingGroupSignal.get,
    editingMember: editingMemberSignal.get,
    editingPolicy: editingPolicySignal.get,
    eventContinuationToken: eventContinuationTokenSignal.get,
    events: eventsSignal.get,
    groupCount: () => groupsSignal.get().length,
    groups: groupsSignal.get,
    handleCloseCreateCollection,
    handleCloseCreateDomain,
    handleCloseCreateGroup,
    handleCloseCreateOrg,
    handleCloseEditCollection,
    handleCloseEditGroup,
    handleCloseEditMember,
    handleCloseEditPolicy,
    handleCloseInviteMember,
    handleCreateCollection,
    handleCreateDomain,
    handleCreateGroup,
    handleCreateOrg,
    handleDeleteCollection,
    handleDeleteDomain,
    handleDeleteGroup,
    handleFilterEvents,
    handleInviteMembers,
    handleLoadMoreEvents,
    handleOpenCreateCollection,
    handleOpenCreateDomain,
    handleOpenCreateGroup,
    handleOpenCreateOrg,
    handleOpenEditCollection,
    handleOpenEditGroup,
    handleOpenEditMember,
    handleOpenEditPolicy,
    handleOpenInviteMember,
    handleRefreshEvents,
    handleReinviteMember,
    handleRemoveGroupMember,
    handleRemoveMember,
    handleRestoreMember,
    handleRevokeMember,
    handleSaveCollection,
    handleSaveGroup,
    handleSaveMember,
    handleSavePolicy,
    handleSaveSso,
    handleSelectCollection,
    handleSelectGroup,
    handleSelectMember,
    handleSelectOrg,
    handleSelectTab,
    handleShowMobileList,
    handleTogglePolicy,
    handleUpdateOrg,
    handleVerifyDomain,
    isCreateCollectionOpen: isCreateCollectionOpenSignal.get,
    isCreateDomainOpen: isCreateDomainOpenSignal.get,
    isCreateGroupOpen: isCreateGroupOpenSignal.get,
    isCreateOrgOpen: isCreateOrgOpenSignal.get,
    isEditCollectionOpen: isEditCollectionOpenSignal.get,
    isEditGroupOpen: isEditGroupOpenSignal.get,
    isEditMemberOpen: isEditMemberOpenSignal.get,
    isEditPolicyOpen: isEditPolicyOpenSignal.get,
    isInviteMemberOpen: isInviteMemberOpenSignal.get,
    isLoading: isLoadingSignal.get,
    memberCount: () => membersSignal.get().length,
    members: membersSignal.get,
    notification: notificationSignal.get,
    organizations: organizationsSignal.get,
    policies: policiesSignal.get,
    policyCount: () => policiesSignal.get().length,
    selectedCollection,
    selectedCollectionId: selectedCollectionIdSignal.get,
    selectedGroup,
    selectedGroupId: selectedGroupIdSignal.get,
    selectedMember,
    selectedMemberId: selectedMemberIdSignal.get,
    setMobilePane: activeMobilePaneSignal.set,
    sso: ssoSignal.get,
  }
}
