import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon1 } from "#ui/interactive/button/ButtonIcon1.jsx"
import { VaultEntryDetail } from "./VaultEntryDetail.jsx"
import { VaultEntryList } from "./VaultEntryList.jsx"
import { VaultItemForm } from "./VaultItemForm.jsx"
import { VaultNav } from "./VaultNav.jsx"
import { vaultSvgIcons } from "./vaultSvgIcons.js"
import { type VaultWorkspaceProps, vaultWorkspaceStateCreate } from "./vaultWorkspaceStateCreate.js"

export function VaultWorkspace(props: VaultWorkspaceProps): JSX.Element {
  const state = vaultWorkspaceStateCreate(props)

  return (
    <div class="flex h-full w-full flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Mobile / Narrow Screen Header & Tab Switcher */}
      <div class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <Show when={state.activeMobileTab() !== "nav"}>
            <ButtonIcon1
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.arrowLeft}
              onClick={() => state.setMobileTab(state.activeMobileTab() === "detail" ? "list" : "nav")}
              class="h-7 gap-1 px-2 text-xs text-blue-600 dark:text-blue-400"
              iconClass="size-3.5 mr-1 text-blue-600 dark:text-blue-400"
            >
              <span>{state.activeMobileTab() === "detail" ? "Items" : "Vaults"}</span>
            </ButtonIcon1>
          </Show>
          <Show when={state.activeMobileTab() === "nav"}>
            <span class="font-bold text-sm text-slate-900 dark:text-slate-50">OneWarden Vaults</span>
          </Show>
        </div>

        {/* Mobile Tab Pills */}
        <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <Button
            variant={state.activeMobileTab() === "nav" ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.setMobileTab("nav")}
            class={`h-7 px-2.5 py-1 text-xs transition-colors ${
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
            onClick={() => state.setMobileTab("list")}
            class={`h-7 px-2.5 py-1 text-xs transition-colors ${
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
            onClick={() => state.setMobileTab("detail")}
            class={`h-7 px-2.5 py-1 text-xs transition-colors ${
              state.activeMobileTab() === "detail"
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Details
          </Button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div class="flex flex-1 overflow-hidden">
        {/* Column 1: Left Navigation */}
        <div
          class={`h-full border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 lg:flex lg:w-64 xl:w-72 ${
            state.activeMobileTab() === "nav" ? "flex w-full" : "hidden"
          }`}
        >
          <VaultNav
            items={state.items}
            selectedVault={state.selectedVault}
            selectedCategory={state.selectedCategory}
            selectedFolder={state.selectedFolder}
            onSelectVault={state.selectVault}
            onSelectCategory={state.selectCategory}
            onSelectFolder={state.selectFolder}
          />
        </div>

        {/* Column 2: Middle Entry Listing */}
        <div
          class={`h-full border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex md:w-80 lg:w-80 xl:w-96 ${
            state.activeMobileTab() === "list" ? "flex w-full" : "hidden"
          }`}
        >
          <VaultEntryList
            items={state.filteredItems}
            selectedItemId={state.selectedItemId}
            searchQuery={state.searchQuery}
            selectedCategory={state.selectedCategory}
            selectedVault={state.selectedVault}
            selectedFolder={state.selectedFolder}
            onSelectItem={state.selectItem}
            onSearchChange={state.setSearchQuery}
            onResetFilter={state.resetFilter}
            onAddNewItem={state.startAdd}
          />
        </div>

        {/* Column 3: Right Entry Details or Item Form */}
        <div
          class={`h-full flex-1 min-w-0 bg-white dark:bg-slate-900 lg:flex ${
            state.activeMobileTab() === "detail" ? "flex w-full" : "hidden"
          }`}
        >
          <Show
            when={state.formMode() !== "none"}
            fallback={
              <VaultEntryDetail
                item={state.selectedItem}
                onToggleFavorite={state.toggleFavorite}
                onEdit={state.startEdit}
                onClone={state.cloneItem}
                onMoveToTrash={state.moveToTrash}
              />
            }
          >
            <VaultItemForm
              mode={state.formMode() === "add" ? "add" : "edit"}
              item={state.itemToEdit}
              initialCategory={state.initialAddCategory()}
              onSave={state.saveItem}
              onCancel={state.cancelForm}
            />
          </Show>
        </div>
      </div>
    </div>
  )
}
