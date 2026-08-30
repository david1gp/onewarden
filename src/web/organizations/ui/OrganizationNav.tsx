import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon1 } from "#ui/interactive/button/ButtonIcon1.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type OrganizationNavProps, organizationNavStateCreate } from "./organizationNavStateCreate.js"

export function OrganizationNav(props: OrganizationNavProps): JSX.Element {
  const state = organizationNavStateCreate(props)

  return (
    <nav
      aria-label="Organization navigation"
      class="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Left: Organization Switcher / Selector */}
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <svg class="size-4.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={vaultSvgIcons.workVault} />
            </svg>
          </div>
          <div>
            <Show
              when={state.orgList().length > 0}
              fallback={<span class="font-bold text-slate-900 text-sm dark:text-slate-100">Organizations</span>}
            >
              <select
                class="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-900 text-sm shadow-2xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={state.currentOrg()?.id ?? ""}
                onChange={state.handleSelectOrgChange}
                aria-label="Select Organization"
              >
                <For each={state.orgList()}>{(org) => <option value={org.id}>{org.name}</option>}</For>
              </select>
            </Show>
          </div>
        </div>

        <ButtonIcon1
          variant="outline"
          size="sm"
          icon={vaultSvgIcons.plus}
          onClick={state.handleNewOrgClick}
          class="h-8 gap-1 px-2.5 text-sm"
          iconClass="size-3.5 mr-1"
        >
          <span>New Org</span>
        </ButtonIcon1>
      </div>

      {/* Right: Tab Navigation */}
      <Show when={state.currentOrg() !== null}>
        <div class="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
          <Button
            variant={state.isTabActive("members") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("members")}
            class={`h-8 gap-1.5 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("members")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Members</span>
            <Badge variant="subtle" class="px-1.5 py-0 text-sm">
              {state.memberCount()}
            </Badge>
          </Button>

          <Button
            variant={state.isTabActive("collections") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("collections")}
            class={`h-8 gap-1.5 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("collections")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Collections</span>
            <Badge variant="subtle" class="px-1.5 py-0 text-sm">
              {state.collectionCount()}
            </Badge>
          </Button>

          <Button
            variant={state.isTabActive("groups") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("groups")}
            class={`h-8 gap-1.5 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("groups")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Groups</span>
            <Badge variant="subtle" class="px-1.5 py-0 text-sm">
              {state.groupCount()}
            </Badge>
          </Button>

          <Button
            variant={state.isTabActive("policies") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("policies")}
            class={`h-8 gap-1.5 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("policies")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Policies</span>
            <Badge variant="subtle" class="px-1.5 py-0 text-sm">
              {state.policyCount()}
            </Badge>
          </Button>

          <Button
            variant={state.isTabActive("events") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("events")}
            class={`h-8 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("events")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Events</span>
          </Button>

          <Button
            variant={state.isTabActive("domains") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("domains")}
            class={`h-8 gap-1.5 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("domains")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Domains</span>
            <Badge variant="subtle" class="px-1.5 py-0 text-sm">
              {state.domainCount()}
            </Badge>
          </Button>

          <Button
            variant={state.isTabActive("sso") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("sso")}
            class={`h-8 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("sso")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>SSO</span>
          </Button>

          <Button
            variant={state.isTabActive("settings") ? "filled" : "ghost"}
            size="sm"
            onClick={() => state.handleSelectTab("settings")}
            class={`h-8 px-3 py-1 text-sm transition-colors ${
              state.isTabActive("settings")
                ? "shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span>Settings</span>
          </Button>
        </div>
      </Show>
    </nav>
  )
}
