import { For, type JSX, Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { extensionFullWindowResourceNavigationStateCreate } from "./extensionFullWindowResourceNavigationStateCreate.js"
import type { extensionFullWindowResourceStateCreate } from "./extensionFullWindowResourceStateCreate.js"

interface ExtensionFullWindowResourceNavigationProps {
  idPrefix?: string
  resourceState: ReturnType<typeof extensionFullWindowResourceStateCreate>
}

export function ExtensionFullWindowResourceNavigation(p: ExtensionFullWindowResourceNavigationProps): JSX.Element {
  const state = extensionFullWindowResourceNavigationStateCreate(p.resourceState)
  return (
    <aside
      aria-label="Vault folders, collections, and organizations"
      class="flex min-w-0 flex-col gap-4 md:w-64 md:shrink-0"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold">Vault</h2>
        <Button variant="ghost" size="sm" aria-pressed={!state.filterActive()} onClick={state.filterClear}>
          All ({state.allCount()})
        </Button>
      </div>
      <Show when={state.resourcesLoading()}>
        <div role="status" aria-label="Loading folders and collections" class="flex justify-center py-4">
          <LoaderShuffle4Dots />
        </div>
      </Show>
      <Show when={!state.resourcesLoading()}>
        <nav aria-label="Organizations" class="flex flex-col gap-1">
          <h3 class="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Organizations</h3>
          <Show
            when={state.activeOrganizations().length > 0}
            fallback={<p class="text-xs text-slate-600 dark:text-slate-300">No organizations.</p>}
          >
            <For each={state.activeOrganizations()}>
              {(organization) => (
                <Button
                  variant={
                    state.selectedOrganization()?.id === organization.id && state.selectedCollection() === null
                      ? "filledBlue"
                      : "ghost"
                  }
                  size="sm"
                  class="w-full justify-start"
                  aria-current={
                    state.selectedOrganization()?.id === organization.id && state.selectedCollection() === null
                      ? "page"
                      : undefined
                  }
                  onClick={() => state.organizationOpen(organization.id)}
                >
                  {state.organizationName(organization.id)} ({state.organizationCount(organization.id)})
                </Button>
              )}
            </For>
          </Show>
        </nav>

        <section aria-labelledby={`${p.idPrefix ?? ""}folders-heading`} class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <h3
              id={`${p.idPrefix ?? ""}folders-heading`}
              class="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300"
            >
              Folders
            </h3>
            <Button variant="ghost" size="sm" disabled={state.busy()} onClick={() => state.actionOpen("folder-create")}>
              New
            </Button>
          </div>
          <Show
            when={state.folders().length > 0}
            fallback={<p class="text-xs text-slate-600 dark:text-slate-300">No folders.</p>}
          >
            <For each={state.folders()}>
              {(folder) => (
                <Button
                  variant={state.selectedFolder()?.id === folder.id ? "filledBlue" : "ghost"}
                  size="sm"
                  class="w-full justify-start"
                  aria-current={state.selectedFolder()?.id === folder.id ? "page" : undefined}
                  onClick={() => state.folderOpen(folder.id)}
                >
                  {folder.name} ({state.folderCount(folder.id)})
                </Button>
              )}
            </For>
          </Show>
          <Show when={state.selectedFolder()}>
            {(folder) => (
              <div class="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={state.busy()}
                  onClick={() => state.actionOpen("folder-edit", folder().name)}
                >
                  Edit folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={state.busy()}
                  onClick={() => state.actionOpen("folder-delete")}
                >
                  Delete folder
                </Button>
              </div>
            )}
          </Show>
        </section>

        <section aria-labelledby={`${p.idPrefix ?? ""}collections-heading`} class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-2">
            <h3
              id={`${p.idPrefix ?? ""}collections-heading`}
              class="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300"
            >
              Collections
            </h3>
            <Show when={state.collectionCreateAvailable()}>
              <Button
                variant="ghost"
                size="sm"
                disabled={state.busy()}
                onClick={() => state.actionOpen("collection-create")}
              >
                New
              </Button>
            </Show>
          </div>
          <Show
            when={state.collections().length > 0}
            fallback={<p class="text-xs text-slate-600 dark:text-slate-300">No collections.</p>}
          >
            <For each={state.collections()}>
              {(collection) => (
                <div class="rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                  <Button
                    variant={state.selectedCollection()?.id === collection.id ? "filledBlue" : "ghost"}
                    size="sm"
                    class="w-full justify-start"
                    aria-current={state.selectedCollection()?.id === collection.id ? "page" : undefined}
                    onClick={() => state.collectionOpen(collection)}
                  >
                    {collection.name} ({state.collectionCount(collection.id)})
                  </Button>
                  <ul
                    aria-label={`Permissions for ${collection.name}`}
                    class="flex list-none flex-wrap gap-1 px-1 pb-1"
                  >
                    <Show when={collection.manage}>
                      <li>
                        <Badge>Manage</Badge>
                      </li>
                    </Show>
                    <Show when={collection.readOnly}>
                      <li>
                        <Badge>Read only</Badge>
                      </li>
                    </Show>
                    <Show when={collection.unmanaged}>
                      <li>
                        <Badge>Unmanaged</Badge>
                      </li>
                    </Show>
                    <Show when={collection.hidePasswords}>
                      <li>
                        <Badge>Passwords hidden</Badge>
                      </li>
                    </Show>
                  </ul>
                </div>
              )}
            </For>
          </Show>
          <Show when={state.selectedCollection()}>
            {(collection) => (
              <div class="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={state.busy() || !state.collectionEditAllowed(collection())}
                  onClick={() => state.actionOpen("collection-edit", collection().name)}
                >
                  Edit collection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={state.busy() || !state.collectionDeleteAllowed(collection())}
                  onClick={() => state.actionOpen("collection-delete")}
                >
                  Delete collection
                </Button>
              </div>
            )}
          </Show>
        </section>
      </Show>

      <Show when={["folder-create", "folder-edit", "collection-create", "collection-edit"].includes(state.action())}>
        <form
          aria-label={state.action().includes("collection") ? "Manage collection" : "Manage folder"}
          class="flex flex-col gap-2 rounded-lg border border-slate-300 p-3 dark:border-slate-700"
          onSubmit={state.formSubmit}
        >
          <Label for={`${p.idPrefix ?? ""}resource-name`}>Name</Label>
          <InputS id={`${p.idPrefix ?? ""}resource-name`} required autofocus valueSignal={state.nameSignal} />
          <Show when={state.validation()}>
            {(message) => (
              <p role="alert" class="text-xs text-red-600 dark:text-red-400">
                {message()}
              </p>
            )}
          </Show>
          <div class="flex gap-1">
            <Button type="submit" variant="filledBlue" size="sm" disabled={state.busy()}>
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={state.actionCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Show>
      <Show when={["folder-delete", "collection-delete"].includes(state.action())}>
        <div
          role="alertdialog"
          aria-label="Confirm resource deletion"
          class="flex flex-col gap-2 rounded-lg border border-red-300 p-3"
        >
          <p class="text-sm">Delete this {state.action().includes("collection") ? "collection" : "folder"}?</p>
          <div class="flex gap-1">
            <Button variant="filledBlue" size="sm" disabled={state.busy()} onClick={state.deleteConfirm}>
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={state.actionCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Show>
    </aside>
  )
}
