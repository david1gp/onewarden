import { For, type JSX, Show } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { SendCreateDialog } from "./SendCreateDialog.jsx"
import { SendEditDialog } from "./SendEditDialog.jsx"
import { type SendFilterTab, type SendListViewProps, sendListViewStateCreate } from "./sendListViewStateCreate.js"

export function SendListView(props: SendListViewProps): JSX.Element {
  const state = sendListViewStateCreate(props)

  const filterTabs: Array<{ id: SendFilterTab; label: string }> = [
    { id: "all", label: "All Sends" },
    { id: "text", label: "Text" },
    { id: "file", label: "Files" },
    { id: "active", label: "Active" },
    { id: "expired", label: "Expired / Disabled" },
  ]

  return (
    <div class="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">Bitwarden Send</h1>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Securely transmit text and encrypted files to anyone with end-to-end encryption
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Show when={props.onNavigateToVault}>
            <Button type="button" variant="outline" size="sm" class="h-8 text-sm" onClick={state.handleBackToVault}>
              <Icon path={vaultSvgIcons.arrowLeft} class="mr-1.5 size-3.5" />
              Back to Vault
            </Button>
          </Show>
          <Button type="button" variant="filled" size="sm" class="h-8 text-sm" onClick={state.openCreate}>
            <Icon path={vaultSvgIcons.plus} class="mr-1.5 size-3.5" />
            New Send
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <Show when={state.errorMessage()}>
        {(msg) => (
          <div
            role="alert"
            class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      <Show when={state.successMessage()}>
        {(msg) => (
          <div
            role="status"
            class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      {/* Main card */}
      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Search and Tabs */}
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-1">
            <For each={filterTabs}>
              {(tab) => (
                <button
                  type="button"
                  onClick={() => state.setActiveTab(tab.id)}
                  class={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    state.activeTab() === tab.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              )}
            </For>
          </div>

          <div class="relative w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search sends..."
              value={state.searchQuery()}
              onInput={(e) => state.setSearchQuery(e.currentTarget.value)}
              class="h-8 w-full text-sm"
            />
          </div>
        </div>

        {/* Sends list */}
        <div class="mt-6">
          <Show
            when={state.sends().length > 0}
            fallback={
              <div class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                {state.isLoading()
                  ? "Loading sends..."
                  : state.searchQuery()
                    ? "No sends match your search filter."
                    : "No sends created yet. Click 'New Send' to create one."}
              </div>
            }
          >
            <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
              <For each={state.sends()}>
                {(item) => (
                  <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-start gap-3">
                      <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                        <Icon path={item.type === 0 ? vaultSvgIcons.send : vaultSvgIcons.file} class="size-4" />
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                          <Show when={item.disabled}>
                            <Badge
                              variant="subtle"
                              class="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-sm"
                            >
                              Disabled
                            </Badge>
                          </Show>
                          <Show when={item.authType === 1}>
                            <Badge
                              variant="subtle"
                              class="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-sm"
                            >
                              Password Protected
                            </Badge>
                          </Show>
                        </div>

                        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <span>{item.type === 0 ? "Text Send" : `File (${item.file?.sizeName ?? "Attachment"})`}</span>
                          <span>•</span>
                          <span>
                            Accessed: {item.accessCount} {item.maxAccessCount ? `/ ${item.maxAccessCount}` : "times"}
                          </span>
                          <Show when={item.expirationDate}>
                            <span>•</span>
                            <span>Expires: {new Date(item.expirationDate!).toLocaleString()}</span>
                          </Show>
                        </div>
                        <Show when={item.notes}>
                          <p class="mt-1 text-sm text-slate-400 dark:text-slate-500 italic">Note: {item.notes}</p>
                        </Show>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-8 text-sm"
                        onClick={() => state.handleCopyLink(item)}
                        title="Copy Public Link"
                      >
                        <Icon path={vaultSvgIcons.copy} class="mr-1 size-3" />
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-8 text-sm"
                        onClick={() => state.handleNavigateAccess(item)}
                        title="Access Send"
                      >
                        <Icon path={vaultSvgIcons.externalLink} class="mr-1 size-3" />
                        Access
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-8 text-sm"
                        onClick={() => state.handleOpenEdit(item)}
                      >
                        <Icon path={vaultSvgIcons.edit} class="mr-1 size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                        onClick={() => state.handleDeleteSend(item.id)}
                        disabled={state.isDeleting() && state.deleteTargetId() === item.id}
                      >
                        <Icon path={vaultSvgIcons.trash} class="mr-1 size-3.5" />
                        {state.isDeleting() && state.deleteTargetId() === item.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </CardWrapper>

      {/* Dialogs */}
      <SendCreateDialog
        session={props.session}
        isOpen={state.isCreateOpen}
        onClose={state.closeCreate}
        onCreated={state.loadSends}
        onNotifySuccess={state.notifySuccess}
        onNotifyError={state.notifyError}
      />

      <SendEditDialog
        session={props.session}
        send={state.selectedSendForEdit}
        isOpen={state.isEditOpen}
        onClose={state.closeEdit}
        onUpdated={state.loadSends}
        onNotifySuccess={state.notifySuccess}
        onNotifyError={state.notifyError}
      />
    </div>
  )
}
