import { createEffect, For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type EmergencyAccessVaultViewDialogProps,
  emergencyAccessVaultViewDialogStateCreate,
} from "./emergencyAccessVaultViewDialogStateCreate.js"

export function EmergencyAccessVaultViewDialog(props: EmergencyAccessVaultViewDialogProps): JSX.Element {
  const state = emergencyAccessVaultViewDialogStateCreate(props)

  createEffect(() => {
    if (props.isOpen() && props.contact()) {
      state.loadVaultItems()
    }
  })

  return (
    <Show when={props.isOpen() && props.contact()}>
      {(contact) => (
        <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-vault-view-dialog-title"
            class="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <Icon path={vaultSvgIcons.personalVault} class="size-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2
                    id="emergency-vault-view-dialog-title"
                    class="font-bold text-base text-slate-900 dark:text-slate-100"
                  >
                    Emergency Vault View
                  </h2>
                  <p class="text-sm text-slate-600 dark:text-slate-400">
                    Vault items of {contact().name || contact().email}
                  </p>
                </div>
              </div>
              <ButtonIconOnly
                type="button"
                variant="ghost"
                size="none"
                title="Close Emergency Vault View dialog"
                aria-label="Close Emergency Vault View dialog"
                icon={vaultSvgIcons.close}
                iconClass="size-4"
                onClick={state.handleClose}
                class="size-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              />
            </div>

            <div class="mt-4 max-h-96 overflow-y-auto">
              <Show when={state.errorMessage()}>
                {(msg) => (
                  <div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {msg()}
                  </div>
                )}
              </Show>

              <Show
                when={!state.isLoading()}
                fallback={
                  <div class="py-12 text-center text-sm text-slate-600 dark:text-slate-400">
                    Loading grantor's vault ciphers...
                  </div>
                }
              >
                <Show
                  when={state.items().length > 0}
                  fallback={
                    <div class="py-12 text-center text-sm text-slate-600 dark:text-slate-400">
                      No vault items found in grantor's account.
                    </div>
                  }
                >
                  <div class="divide-y divide-slate-100 dark:divide-slate-800">
                    <For each={state.items()}>
                      {(item) => (
                        <div class="flex items-center justify-between py-3 text-sm">
                          <div class="flex items-center gap-3">
                            <div class="flex size-8 items-center justify-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                              <Icon path={vaultSvgIcons.login} class="size-4" />
                            </div>
                            <div>
                              <p class="font-semibold text-slate-900 dark:text-slate-100">
                                {String(item.name ?? "Encrypted Cipher")}
                              </p>
                              <p class="text-sm text-slate-600 dark:text-slate-400">
                                Type:{" "}
                                {item.type === 1
                                  ? "Login"
                                  : item.type === 2
                                    ? "Secure Note"
                                    : item.type === 3
                                      ? "Card"
                                      : "Identity"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>

            <div class="flex items-center justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" class="h-8" onClick={state.handleClose}>
                <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Show>
  )
}
