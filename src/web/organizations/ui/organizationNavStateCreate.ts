import type { Accessor } from "solid-js"
import type { Organization } from "../schemas/organizationSchema.js"
import type { OrganizationWorkspaceTab } from "../schemas/organizationWorkspaceTab.js"

export interface OrganizationNavProps {
  activeOrg: Accessor<Organization | null>
  activeTab: Accessor<OrganizationWorkspaceTab>
  collectionCount: Accessor<number>
  domainCount: Accessor<number>
  groupCount: Accessor<number>
  memberCount: Accessor<number>
  onOpenCreateOrg: () => void
  onSelectOrg: (orgId: string) => void
  onSelectTab: (tab: OrganizationWorkspaceTab) => void
  organizations: Accessor<Organization[]>
  policyCount: Accessor<number>
}

export function organizationNavStateCreate(props: OrganizationNavProps) {
  const currentOrg = () => props.activeOrg()
  const orgList = () => props.organizations()
  const currentTab = () => props.activeTab()

  const isTabActive = (tab: OrganizationWorkspaceTab) => currentTab() === tab

  const handleSelectTab = (tab: OrganizationWorkspaceTab) => {
    props.onSelectTab(tab)
  }

  const handleSelectOrgChange = (event: Event) => {
    const target = event.target as HTMLSelectElement
    props.onSelectOrg(target.value)
  }

  const handleNewOrgClick = () => {
    props.onOpenCreateOrg()
  }

  return {
    collectionCount: props.collectionCount,
    currentOrg,
    domainCount: props.domainCount,
    groupCount: props.groupCount,
    handleNewOrgClick,
    handleSelectOrgChange,
    handleSelectTab,
    isTabActive,
    memberCount: props.memberCount,
    orgList,
    policyCount: props.policyCount,
  }
}
