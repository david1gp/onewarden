import { For, type JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationPolicyListProps,
  organizationPolicyListStateCreate,
} from "./organizationPolicyListStateCreate.js"

export function OrganizationPolicyList(props: OrganizationPolicyListProps): JSX.Element {
  const state = organizationPolicyListStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
      {/* Header & Search */}
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-bold text-slate-900 text-xl dark:text-slate-100">Enterprise Security Policies</h2>
          <p class="mt-1 text-slate-500 text-sm dark:text-slate-400">
            Enforce organization-wide security rules, credential complexity, and access controls.
          </p>
        </div>
        <div class="relative flex items-center sm:w-64">
          <Icon
            path={vaultSvgIcons.search}
            class="pointer-events-none absolute left-2.5 size-3.5 text-slate-400 dark:text-slate-500"
          />
          <Input
            type="search"
            placeholder="Search policies..."
            value={state.searchQuery()}
            onInput={(e) => state.handleSearchChange(e.currentTarget.value)}
            class="h-8 w-full rounded-md border-slate-200 bg-white pl-8 pr-3 text-sm placeholder:text-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Policy Grid */}
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <For
          each={state.filteredPolicies()}
          fallback={
            <div class="col-span-full rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm dark:border-slate-800 dark:bg-slate-900">
              <p>No security policies found matching search.</p>
            </div>
          }
        >
          {(policy) => {
            const isEnabled = () => policy.enabled
            const name = () => state.getPolicyName(policy.type)
            const description = () => state.getPolicyDescription(policy.type)

            return (
              <div class="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-shadow hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <svg class="size-4.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={vaultSvgIcons.shieldCheck} />
                      </svg>
                    </div>
                    <Badge variant={isEnabled() ? "filledBlue" : "subtle"} class="text-sm px-2 py-0.5">
                      {isEnabled() ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  <h3 class="mt-3.5 font-bold text-slate-900 text-sm dark:text-slate-100">{name()}</h3>
                  <p class="mt-1.5 text-slate-600 text-sm leading-relaxed dark:text-slate-400">{description()}</p>
                </div>

                <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <span class="font-mono text-sm text-slate-600">Type #{policy.type}</span>
                  <div class="flex items-center gap-2">
                    <Button
                      variant={isEnabled() ? "outline" : "subtle"}
                      size="sm"
                      onClick={() => state.handleToggle(policy)}
                      class="h-8 px-2.5 text-sm"
                    >
                      <Icon
                        path={isEnabled() ? vaultSvgIcons.shieldAlert : vaultSvgIcons.shieldCheck}
                        class="mr-1.5 size-3.5"
                      />
                      {isEnabled() ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="filled"
                      size="sm"
                      onClick={() => state.handleEdit(policy)}
                      class="h-8 px-2.5 text-sm"
                    >
                      <Icon path={vaultSvgIcons.cog} class="mr-1.5 size-3.5" />
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
