import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { VaultEntryDetail } from "../../demo/VaultEntryDetail.jsx"
import { VaultEntryList } from "../../demo/VaultEntryList.jsx"
import { VaultItemForm } from "../../demo/VaultItemForm.jsx"
import { VaultNav } from "../../demo/VaultNav.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import type { VaultWorkspaceViewProps } from "./vaultWorkspaceViewProps.js"
import { CipherDialogView } from "../../ciphers/ui/CipherDialogView.jsx"

export function VaultWorkspace(props: VaultWorkspaceViewProps): JSX.Element {
  const { actions, state } = props

  return (
    <div class="flex h-full w-full flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <Show when={state.activeMobileTab() !== "nav"}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.arrowLeft}
              onClick={() => actions.setMobileTab(state.activeMobileTab() === "detail" ? "list" : "nav")}
              aria-label={state.activeMobileTab() === "detail" ? "Back to items" : "Back to vaults"}
              class="h-7 gap-1 px-2 text-sm text-blue-600 dark:text-blue-400"
              iconClass="size-3.5 mr-1 text-blue-600 dark:text-blue-400"
            >
              <span>{state.activeMobileTab() === "detail" ? "Items" : "Vaults"}</span>
            </ButtonIcon>
          </Show>
          <Show when={state.activeMobileTab() === "nav"}>
            <span class="font-bold text-sm text-slate-900 dark:text-slate-50">OneWarden Vaults</span>
          </Show>
        </div>

        <nav aria-label="Vault sections" class="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
          <Button
            variant={state.activeMobileTab() === "nav" ? "filled" : "ghost"}
            size="sm"
            onClick={() => actions.setMobileTab("nav")}
            class={`h-7 px-2.5 py-1 text-sm transition-colors ${
              state.activeMobileTab() === "nav"
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Vaults
          </Button>
          <Button
            variant={state.activeMobileTab() === "list" ? "filled" : "ghost"}
            size="sm"
            onClick={() => actions.setMobileTab("list")}
            class={`h-7 px-2.5 py-1 text-sm transition-colors ${
              state.activeMobileTab() === "list"
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Items ({state.filteredItems().length})
          </Button>
          <Button
            variant={state.activeMobileTab() === "detail" ? "filled" : "ghost"}
            size="sm"
            onClick={() => actions.setMobileTab("detail")}
            class={`h-7 px-2.5 py-1 text-sm transition-colors ${
              state.activeMobileTab() === "detail"
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Details
          </Button>
        </nav>
      </div>

      <div class="flex min-h-0 flex-1 overflow-hidden">
        <div
          id="vault-navigation-column"
          class={`h-full min-h-0 min-w-0 shrink-0 border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 lg:flex lg:w-64 xl:w-72 ${
            state.activeMobileTab() === "nav" ? "flex w-full" : "hidden"
          }`}
        >
          <VaultNav
            items={state.navigationItems}
            collections={state.collections}
            selectedVault={state.selectedVault}
            selectedCategory={state.selectedCategory}
            selectedFolder={state.selectedFolder}
            selectedCollection={state.selectedCollection}
            profile={props.profile}
            onSelectVault={actions.selectVault}
            onSelectCategory={actions.selectCategory}
            onSelectFolder={actions.selectFolder}
            onSelectCollection={actions.selectCollection}
          />
        </div>

        <div
          id="vault-items-column"
          class={`h-full min-h-0 min-w-0 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:w-80 xl:w-96 ${
            state.activeMobileTab() === "list" ? "flex w-full" : "hidden"
          }`}
        >
          <VaultEntryList
            items={state.filteredItems}
            collections={state.collections}
            selectedItemId={state.selectedItemId}
            searchQuery={state.searchQuery}
            selectedCategory={state.selectedCategory}
            selectedVault={state.selectedVault}
            selectedFolder={state.selectedFolder}
            selectedCollection={state.selectedCollection}
            selectedSortSignal={state.selectedSortSignal}
            searchInputElement={actions.setSearchInputElement}
            onSelectItem={actions.selectItem}
            onSearchChange={actions.setSearchQuery}
            onResetFilter={actions.resetFilter}
            onAddNewItem={state.isApiBacked ? actions.openCreateDialog : actions.startAdd}
          />
        </div>

        <div
          id="vault-detail-column"
          class={`h-full min-h-0 flex-1 min-w-0 bg-white dark:bg-slate-900 lg:flex ${
            state.activeMobileTab() === "detail" ? "flex w-full" : "hidden"
          }`}
        >
          <Show
            when={state.isApiBacked}
            fallback={
              <Show
                when={state.formMode() !== "none"}
                fallback={
                  <VaultEntryDetail
                    item={state.selectedItem}
                    cipherItem={state.selectedCipherItem}
                    collections={state.collections}
                    copyToClipboard={props.copyToClipboard}
                    onToggleFavorite={actions.toggleFavorite}
                    onEdit={actions.startEdit}
                    onClone={actions.cloneItem}
                    onDelete={(id, hard) => (hard ? actions.permanentlyDeleteItem(id) : actions.moveToTrash(id))}
                    onRestore={actions.restoreItem}
                    fillAvailable={props.fillAvailable}
                    onFill={props.onFill}
                  />
                }
              >
                <VaultItemForm
                  mode={state.formMode() === "add" ? "add" : "edit"}
                  item={state.itemToEdit}
                  initialCategory={state.initialAddCategory()}
                  onSave={actions.saveItem}
                  onCancel={actions.cancelForm}
                />
              </Show>
            }
          >
            <VaultEntryDetail
              item={state.selectedItem}
              cipherItem={state.selectedCipherItem}
              collections={state.collections}
              copyToClipboard={props.copyToClipboard}
              enableFavoriteAction
              onToggleFavorite={actions.toggleFavorite}
              onEdit={actions.openEditDialog}
              onDelete={actions.handleCipherDelete}
              onRestore={actions.handleCipherRestore}
              onArchive={actions.handleCipherArchive}
              onClone={actions.handleCipherClone}
              onShare={actions.handleCipherShare}
              onUploadAttachment={actions.handleCipherUploadAttachment}
              onDeleteAttachment={actions.handleCipherDeleteAttachment}
              fillAvailable={props.fillAvailable}
              onFill={props.onFill}
            />
          </Show>
        </div>
      </div>

      <Show when={state.isApiBacked}>
        <CipherDialogView state={state.cipherDialog} />
      </Show>
    </div>
  )
}
