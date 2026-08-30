import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { OrganizationNav } from "./OrganizationNav.jsx"
import { OrganizationSettingsCard } from "./OrganizationSettingsCard.jsx"
import { OrganizationMemberList } from "./OrganizationMemberList.jsx"
import { OrganizationMemberDetail } from "./OrganizationMemberDetail.jsx"
import { OrganizationMemberInviteDialog } from "./OrganizationMemberInviteDialog.jsx"
import { OrganizationMemberEditDialog } from "./OrganizationMemberEditDialog.jsx"
import { OrganizationCollectionList } from "./OrganizationCollectionList.jsx"
import { OrganizationCollectionDetail } from "./OrganizationCollectionDetail.jsx"
import { OrganizationCollectionCreateDialog } from "./OrganizationCollectionCreateDialog.jsx"
import { OrganizationCollectionEditDialog } from "./OrganizationCollectionEditDialog.jsx"
import { OrganizationGroupList } from "./OrganizationGroupList.jsx"
import { OrganizationGroupDetail } from "./OrganizationGroupDetail.jsx"
import { OrganizationGroupCreateDialog } from "./OrganizationGroupCreateDialog.jsx"
import { OrganizationGroupEditDialog } from "./OrganizationGroupEditDialog.jsx"
import { OrganizationPolicyList } from "./OrganizationPolicyList.jsx"
import { OrganizationPolicyEditDialog } from "./OrganizationPolicyEditDialog.jsx"
import { OrganizationEventViewer } from "./OrganizationEventViewer.jsx"
import { OrganizationDomainList } from "./OrganizationDomainList.jsx"
import { OrganizationDomainCreateDialog } from "./OrganizationDomainCreateDialog.jsx"
import { OrganizationSsoCard } from "./OrganizationSsoCard.jsx"
import { OrganizationCreateDialog } from "./OrganizationCreateDialog.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationWorkspaceProps,
  organizationWorkspaceStateCreate,
} from "./organizationWorkspaceStateCreate.js"

export function OrganizationWorkspace(props: OrganizationWorkspaceProps): JSX.Element {
  const state = organizationWorkspaceStateCreate(props)

  return (
    <div class="flex h-full w-full flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Organization Navigation Bar */}
      <OrganizationNav
        activeOrg={state.activeOrg}
        activeTab={state.activeTab}
        collectionCount={state.collectionCount}
        domainCount={state.domainCount}
        groupCount={state.groupCount}
        memberCount={state.memberCount}
        onOpenCreateOrg={state.handleOpenCreateOrg}
        onSelectOrg={state.handleSelectOrg}
        onSelectTab={state.handleSelectTab}
        organizations={state.organizations}
        policyCount={state.policyCount}
      />

      {/* Global Notification Banner */}
      <Show when={state.notification()}>
        {(notif) => (
          <div
            role={notif().error ? "alert" : "status"}
            class={`flex items-center justify-between px-4 py-2 text-sm font-medium ${
              notif().error ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            <span>{notif().message}</span>
          </div>
        )}
      </Show>

      {/* Main Workspace Body */}
      <main class="flex flex-1 overflow-hidden">
        <h1 class="sr-only">Organization Management</h1>
        <Show
          when={state.activeOrg()}
          fallback={
            <div class="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div class="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <svg class="size-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={vaultSvgIcons.workVault} />
                </svg>
              </div>
              <h2 class="mt-4 font-bold text-slate-900 text-xl dark:text-slate-100">No Organizations Found</h2>
              <p class="mt-2 max-w-sm text-slate-600 text-sm dark:text-slate-300">
                Create your first organization to share ciphers, manage collections, and invite team members.
              </p>
              <div class="mt-6">
                <Button variant="filled" class="h-8" onClick={state.handleOpenCreateOrg}>
                  <Icon path={vaultSvgIcons.plus} class="mr-1.5 size-3.5" />
                  Create Organization
                </Button>
              </div>
            </div>
          }
        >
          {/* Tab 1: Members (2-Column Master-Detail Layout) */}
          <Show when={state.activeTab() === "members"}>
            <div class="flex flex-1 overflow-hidden">
              {/* Left: Member List */}
              <div
                class={`h-full md:flex md:w-80 lg:w-96 ${
                  state.activeMobilePane() === "list" ? "flex w-full" : "hidden"
                }`}
              >
                <OrganizationMemberList
                  members={state.members}
                  onInviteClick={state.handleOpenInviteMember}
                  onSelectMember={state.handleSelectMember}
                  selectedMemberId={state.selectedMemberId}
                />
              </div>

              {/* Right: Member Detail */}
              <div
                class={`h-full flex-1 min-w-0 md:flex ${
                  state.activeMobilePane() === "detail" ? "flex w-full" : "hidden"
                }`}
              >
                <OrganizationMemberDetail
                  member={state.selectedMember}
                  onBack={state.handleShowMobileList}
                  onEdit={state.handleOpenEditMember}
                  onReinvite={state.handleReinviteMember}
                  onRemove={state.handleRemoveMember}
                  onRestore={state.handleRestoreMember}
                  onRevoke={state.handleRevokeMember}
                />
              </div>
            </div>
          </Show>

          {/* Tab 2: Collections (2-Column Master-Detail Layout) */}
          <Show when={state.activeTab() === "collections"}>
            <div class="flex flex-1 overflow-hidden">
              {/* Left: Collection List */}
              <div
                class={`h-full md:flex md:w-80 lg:w-96 ${
                  state.activeMobilePane() === "list" ? "flex w-full" : "hidden"
                }`}
              >
                <OrganizationCollectionList
                  collections={state.collections}
                  onCreateClick={state.handleOpenCreateCollection}
                  onSelectCollection={state.handleSelectCollection}
                  selectedCollectionId={state.selectedCollectionId}
                />
              </div>

              {/* Right: Collection Detail */}
              <div
                class={`h-full flex-1 min-w-0 md:flex ${
                  state.activeMobilePane() === "detail" ? "flex w-full" : "hidden"
                }`}
              >
                <OrganizationCollectionDetail
                  collection={state.selectedCollection}
                  onBack={state.handleShowMobileList}
                  onDelete={state.handleDeleteCollection}
                  onEdit={state.handleOpenEditCollection}
                />
              </div>
            </div>
          </Show>

          {/* Tab 3: Groups (2-Column Master-Detail Layout) */}
          <Show when={state.activeTab() === "groups"}>
            <div class="flex flex-1 overflow-hidden">
              {/* Left: Group List */}
              <div
                class={`h-full md:flex md:w-80 lg:w-96 ${
                  state.activeMobilePane() === "list" ? "flex w-full" : "hidden"
                }`}
              >
                <OrganizationGroupList
                  groups={state.groups}
                  onCreateClick={state.handleOpenCreateGroup}
                  onSelectGroup={state.handleSelectGroup}
                  selectedGroupId={state.selectedGroupId}
                />
              </div>

              {/* Right: Group Detail */}
              <div
                class={`h-full flex-1 min-w-0 md:flex ${
                  state.activeMobilePane() === "detail" ? "flex w-full" : "hidden"
                }`}
              >
                <OrganizationGroupDetail
                  collections={state.collections}
                  group={state.selectedGroup}
                  members={state.members}
                  onBack={state.handleShowMobileList}
                  onDelete={state.handleDeleteGroup}
                  onEdit={state.handleOpenEditGroup}
                  onRemoveMember={state.handleRemoveGroupMember}
                />
              </div>
            </div>
          </Show>

          {/* Tab 4: Policies */}
          <Show when={state.activeTab() === "policies"}>
            <div class="h-full flex-1 overflow-y-auto">
              <OrganizationPolicyList
                onEditPolicy={state.handleOpenEditPolicy}
                onTogglePolicy={state.handleTogglePolicy}
                policies={state.policies}
              />
            </div>
          </Show>

          {/* Tab 5: Events */}
          <Show when={state.activeTab() === "events"}>
            <div class="h-full flex-1 overflow-y-auto">
              <OrganizationEventViewer
                continuationToken={state.eventContinuationToken}
                events={state.events}
                isLoading={state.isLoading}
                members={state.members}
                onFilterChange={state.handleFilterEvents}
                onLoadMore={state.handleLoadMoreEvents}
                onRefresh={state.handleRefreshEvents}
              />
            </div>
          </Show>

          {/* Tab 6: Domains */}
          <Show when={state.activeTab() === "domains"}>
            <div class="h-full flex-1 overflow-y-auto">
              <OrganizationDomainList
                domains={state.domains}
                onCreateClick={state.handleOpenCreateDomain}
                onDeleteDomain={state.handleDeleteDomain}
                onVerifyDomain={state.handleVerifyDomain}
              />
            </div>
          </Show>

          {/* Tab 7: SSO */}
          <Show when={state.activeTab() === "sso"}>
            <div class="h-full flex-1 overflow-y-auto">
              <OrganizationSsoCard onSaveSso={state.handleSaveSso} sso={state.sso} />
            </div>
          </Show>

          {/* Tab 8: Settings */}
          <Show when={state.activeTab() === "settings"}>
            <div class="h-full flex-1 overflow-y-auto">
              <OrganizationSettingsCard organization={state.activeOrg} onUpdateOrg={state.handleUpdateOrg} />
            </div>
          </Show>
        </Show>
      </main>

      {/* Dialog Modals */}
      <OrganizationCreateDialog
        isOpen={state.isCreateOrgOpen}
        onClose={state.handleCloseCreateOrg}
        onCreate={state.handleCreateOrg}
      />

      <OrganizationMemberInviteDialog
        collections={state.collections}
        isOpen={state.isInviteMemberOpen}
        onClose={state.handleCloseInviteMember}
        onInvite={state.handleInviteMembers}
      />

      <OrganizationMemberEditDialog
        collections={state.collections}
        isOpen={state.isEditMemberOpen}
        member={state.editingMember}
        onClose={state.handleCloseEditMember}
        onSave={state.handleSaveMember}
      />

      <OrganizationCollectionCreateDialog
        isOpen={state.isCreateCollectionOpen}
        members={state.members}
        onClose={state.handleCloseCreateCollection}
        onCreate={state.handleCreateCollection}
      />

      <OrganizationCollectionEditDialog
        collection={state.editingCollection}
        isOpen={state.isEditCollectionOpen}
        members={state.members}
        onClose={state.handleCloseEditCollection}
        onSave={state.handleSaveCollection}
      />

      <OrganizationGroupCreateDialog
        collections={state.collections}
        isOpen={state.isCreateGroupOpen}
        members={state.members}
        onClose={state.handleCloseCreateGroup}
        onCreate={state.handleCreateGroup}
      />

      <OrganizationGroupEditDialog
        collections={state.collections}
        group={state.editingGroup}
        isOpen={state.isEditGroupOpen}
        members={state.members}
        onClose={state.handleCloseEditGroup}
        onSave={state.handleSaveGroup}
      />

      <OrganizationPolicyEditDialog
        isOpen={state.isEditPolicyOpen}
        onClose={state.handleCloseEditPolicy}
        onSave={state.handleSavePolicy}
        policy={state.editingPolicy}
      />

      <OrganizationDomainCreateDialog
        isOpen={state.isCreateDomainOpen}
        onClose={state.handleCloseCreateDomain}
        onCreate={state.handleCreateDomain}
      />
    </div>
  )
}
