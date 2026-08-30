import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { OrganizationCollectionCreateDialog } from "../organizations/ui/OrganizationCollectionCreateDialog.jsx"
import { OrganizationCollectionDetail } from "../organizations/ui/OrganizationCollectionDetail.jsx"
import { OrganizationCollectionEditDialog } from "../organizations/ui/OrganizationCollectionEditDialog.jsx"
import { OrganizationCollectionList } from "../organizations/ui/OrganizationCollectionList.jsx"
import type { AdminShellState } from "./AdminShellState.js"
import { adminCollectionsPanelStateCreate } from "./adminCollectionsPanelStateCreate.js"

export function AdminCollectionsPanel(p: { state: AdminShellState }): JSX.Element {
  const state = adminCollectionsPanelStateCreate(p.state)

  return (
    <section aria-labelledby="admin-collections-title" class="mt-8">
      <h3 id="admin-collections-title" class="text-lg font-semibold">
        Collections
      </h3>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Manage collections and member permissions for the selected organization.
      </p>

      <fieldset class="mt-4 flex flex-wrap gap-2">
        <legend class="sr-only">Collection organization</legend>
        <For each={p.state.collectionState.organizations()}>
          {(organization) => (
            <Button
              variant={state.isSelectedOrganization(organization.id) ? "filledBlue" : "outline"}
              size="sm"
              class="h-8 text-sm"
              aria-pressed={state.isSelectedOrganization(organization.id)}
              onClick={state.selectOrganization(organization.id)}
            >
              {organization.name}
            </Button>
          )}
        </For>
      </fieldset>

      <Show
        when={state.selectedOrganization()}
        fallback={
          <p class="mt-4 text-sm text-slate-600 dark:text-slate-400">
            No organizations are available for collection management.
          </p>
        }
      >
        <div class="mt-4 flex h-[32rem] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div class={`h-full md:flex md:w-80 lg:w-96 ${state.mobilePane() === "list" ? "flex w-full" : "hidden"}`}>
            <OrganizationCollectionList
              collections={state.collections}
              onCreateClick={state.openCreate}
              onSelectCollection={state.selectCollection}
              selectedCollectionId={state.selectedCollectionId}
            />
          </div>
          <div class={`h-full min-w-0 flex-1 md:flex ${state.mobilePane() === "detail" ? "flex w-full" : "hidden"}`}>
            <OrganizationCollectionDetail
              collection={state.selectedCollection}
              onBack={state.showList}
              onDelete={state.deleteCollection}
              onEdit={state.openEdit}
            />
          </div>
        </div>
      </Show>

      <OrganizationCollectionCreateDialog
        isOpen={state.isCreateOpen}
        members={state.members}
        onClose={state.closeCreate}
        onCreate={state.createCollection}
      />

      <OrganizationCollectionEditDialog
        collection={state.editingCollection}
        isOpen={state.isEditOpen}
        members={state.members}
        onClose={state.closeEdit}
        onSave={state.saveCollection}
      />
    </section>
  )
}
