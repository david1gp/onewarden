import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type SendCreateDialogProps, sendCreateDialogStateCreate } from "./sendCreateDialogStateCreate.js"

export function SendCreateDialog(props: SendCreateDialogProps): JSX.Element {
  const state = sendCreateDialogStateCreate(props)

  return (
    <Show when={props.isOpen()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-create-dialog-title"
          class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <Icon path={vaultSvgIcons.send} class="size-5 text-blue-600 dark:text-blue-400" />
              <h2 id="send-create-dialog-title" class="font-bold text-base text-slate-900 dark:text-slate-100">
                Create Send
              </h2>
            </div>
            <ButtonIconOnly
              type="button"
              variant="ghost"
              size="none"
              title="Close Create Send dialog"
              aria-label="Close Create Send dialog"
              icon={vaultSvgIcons.close}
              iconClass="size-4"
              onClick={state.handleClose}
              class="size-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            />
          </div>

          <form onSubmit={state.handleSubmit} class="mt-4 space-y-4 text-sm">
            {/* Type selector */}
            <div class="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => state.setSendType(0)}
                class={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  state.sendType() === 0
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Text
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => state.setSendType(1)}
                class={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                  state.sendType() === 1
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                File
              </Button>
            </div>

            <div>
              <label for="send-name" class="block font-medium text-slate-700 dark:text-slate-300">
                Name
              </label>
              <Input
                id="send-name"
                type="text"
                value={state.name()}
                onInput={(e) => state.setName(e.currentTarget.value)}
                placeholder="Send name"
                required
                class="mt-1 w-full"
              />
            </div>

            <Show
              when={state.sendType() === 0}
              fallback={
                <div>
                  <label for="send-file" class="block font-medium text-slate-700 dark:text-slate-300">
                    File
                  </label>
                  <input
                    id="send-file"
                    type="file"
                    onChange={state.handleFileChange}
                    class="mt-1 block w-full text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300"
                  />
                  <Show when={state.selectedFile()}>
                    {(file) => (
                      <p class="mt-1 text-sm text-slate-500">
                        {file().name} ({(file().size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </Show>
                </div>
              }
            >
              <div>
                <label for="send-text-content" class="block font-medium text-slate-700 dark:text-slate-300">
                  Text to Send
                </label>
                <Textarea
                  id="send-text-content"
                  value={state.textContent()}
                  onInput={(e) => state.setTextContent(e.currentTarget.value)}
                  placeholder="Enter text, secret note, code snippet, etc."
                  rows={4}
                  required
                  class="mt-1 w-full"
                />
              </div>
            </Show>

            <div>
              <label for="send-notes" class="block font-medium text-slate-700 dark:text-slate-300">
                Private Notes (Only visible to you)
              </label>
              <Input
                id="send-notes"
                type="text"
                value={state.notes()}
                onInput={(e) => state.setNotes(e.currentTarget.value)}
                placeholder="Optional notes"
                class="mt-1 w-full"
              />
            </div>

            <div>
              <label for="send-recipient-emails" class="block font-medium text-slate-700 dark:text-slate-300">
                Recipient Verification Emails
              </label>
              <Input
                id="send-recipient-emails"
                type="text"
                value={state.emails()}
                onInput={(e) => state.setEmails(e.currentTarget.value)}
                placeholder="person@example.com, another@example.com"
                aria-describedby="send-recipient-emails-help"
                class="mt-1 w-full"
              />
              <p id="send-recipient-emails-help" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Optional. Authorized recipients receive a one-time access code by email.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label for="send-password" class="block font-medium text-slate-700 dark:text-slate-300">
                  Optional Password
                </label>
                <Input
                  id="send-password"
                  type="password"
                  value={state.password()}
                  onInput={(e) => state.setPassword(e.currentTarget.value)}
                  placeholder="Protect with password"
                  disabled={state.emails().trim().length > 0}
                  class="mt-1 w-full"
                />
                <Show when={state.emails().trim().length > 0}>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Recipient verification replaces password protection.
                  </p>
                </Show>
              </div>
              <div>
                <label for="send-max-access-count" class="block font-medium text-slate-700 dark:text-slate-300">
                  Max Access Count
                </label>
                <Input
                  id="send-max-access-count"
                  type="number"
                  min="1"
                  value={state.maxAccessCount()}
                  onInput={(e) => state.setMaxAccessCount(e.currentTarget.value)}
                  placeholder="Unlimited"
                  class="mt-1 w-full"
                />
              </div>
            </div>

            <div>
              <label for="send-expiration" class="block font-medium text-slate-700 dark:text-slate-300">
                Expiration
              </label>
              <SelectSingleNative
                id="send-expiration"
                valueSignal={state.expirationOptionSignal}
                getOptions={() => ["1hour", "1day", "7days", "30days", "never"]}
                valueText={(value) =>
                  ({ "1hour": "1 Hour", "1day": "1 Day", "7days": "7 Days", "30days": "30 Days", never: "Never" })[
                    value
                  ] ?? value
                }
                class="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <Checkbox
              id="hideEmail"
              checked={state.hideEmail()}
              onChange={(checked) => state.setHideEmail(checked)}
              class="pt-2 text-sm text-slate-700 dark:text-slate-300"
            >
              Hide my email address from recipients
            </Checkbox>

            <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" class="h-8" onClick={state.handleClose}>
                <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                Cancel
              </Button>
              <Button type="submit" variant="filled" size="sm" class="h-8" disabled={state.isSubmitting()}>
                <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
                {state.isSubmitting() ? "Creating..." : "Create Send"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  )
}
