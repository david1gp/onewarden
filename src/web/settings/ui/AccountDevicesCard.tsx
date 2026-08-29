import { For, type JSX, Show } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AccountDevicesCardProps, accountDevicesCardStateCreate } from "./accountDevicesCardStateCreate.js"

export function AccountDevicesCard(props: AccountDevicesCardProps): JSX.Element {
  const state = accountDevicesCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Icon path={vaultSvgIcons.cellphone} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">
              Authorized Devices &amp; Sessions
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Active clients currently authorized to access your vault
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs"
            onClick={state.loadDevices}
            disabled={state.isLoading()}
          >
            <Icon path={vaultSvgIcons.refresh} class="mr-1 size-3.5" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs text-red-600 dark:text-red-400"
            onClick={state.openDeauthorizeDialog}
          >
            Deauthorize All
          </Button>
        </div>
      </div>

      <Show when={state.isDeauthorizeDialogOpen()}>
        <div class="my-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
          <h3 class="font-semibold text-xs text-red-900 dark:text-red-200">Deauthorize All Sessions</h3>
          <p class="mt-1 text-[11px] text-red-800 dark:text-red-300">
            This will log out all other active web sessions, desktop apps, mobile devices, and browser extensions.
          </p>
          <div class="mt-3 flex max-w-md items-center gap-2">
            <Input
              type="password"
              placeholder="Master password"
              value={state.masterPasswordInput()}
              onInput={(e) => state.setMasterPasswordInput(e.currentTarget.value)}
              class="h-8 w-full rounded-md border-red-300 bg-white px-2.5 text-xs dark:border-red-800 dark:bg-slate-900"
            />
            <Button
              type="button"
              variant="filled"
              size="sm"
              class="h-8 shrink-0 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={state.handleDeauthorizeAll}
              disabled={state.isDeauthorizing()}
            >
              {state.isDeauthorizing() ? "Revoking..." : "Confirm Deauthorize"}
            </Button>
            <Button type="button" variant="ghost" size="sm" class="h-8 text-xs" onClick={state.closeDeauthorizeDialog}>
              Cancel
            </Button>
          </div>
        </div>
      </Show>

      <div class="mt-6">
        <Show
          when={state.devices().length > 0}
          fallback={
            <div class="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {state.isLoading() ? "Loading active devices..." : "No active devices found."}
            </div>
          }
        >
          <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <For each={state.devices()}>
              {(dev) => (
                <div class="flex items-center justify-between py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex size-8 items-center justify-center rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Icon path={vaultSvgIcons.server} class="size-4" />
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-xs text-slate-900 dark:text-slate-100">
                          {dev.name || state.deviceTypeLabel(dev.type)}
                        </span>
                        <Show when={dev.isCurrent}>
                          <Badge
                            variant="subtle"
                            class="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]"
                          >
                            Current Device
                          </Badge>
                        </Show>
                      </div>
                      <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{state.deviceTypeLabel(dev.type)}</span>
                        <span>•</span>
                        <span>IP: {dev.ip ?? "Unknown"}</span>
                      </div>
                    </div>
                  </div>
                  <div class="text-right text-[11px] text-slate-500 dark:text-slate-400">
                    <div>Added: {new Date(dev.creationDate).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </CardWrapper>
  )
}
