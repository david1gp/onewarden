import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type SendAccessViewProps, sendAccessViewStateCreate } from "./sendAccessViewStateCreate.js"

export function SendAccessView(props: SendAccessViewProps): JSX.Element {
  const state = sendAccessViewStateCreate(props)

  return (
    <div class="mx-auto max-w-xl px-4 py-12">
      <CardWrapper class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Header */}
        <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Icon path={vaultSvgIcons.send} class="size-5" />
            </div>
            <div>
              <h1 class="font-bold text-lg text-slate-900 dark:text-slate-100">Bitwarden Send</h1>
              <p class="text-sm text-slate-500 dark:text-slate-400">Encrypted transmission</p>
            </div>
          </div>
          <Show when={props.onNavigateHome}>
            <Button type="button" variant="outline" size="sm" class="h-8 text-sm" onClick={state.handleNavigateHome}>
              <Icon path={vaultSvgIcons.personalVault} class="mr-1.5 size-3.5" />
              Vault
            </Button>
          </Show>
        </div>

        {/* Error / Alert */}
        <Show when={state.errorMessage()}>
          {(msg) => (
            <div
              role="alert"
              class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {msg()}
            </div>
          )}
        </Show>

        {/* Loading state */}
        <Show when={state.isLoading()}>
          <div class="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Accessing Send...</div>
        </Show>

        {/* Password Required form */}
        <Show when={!state.isLoading() && state.isPasswordRequired()}>
          <div class="mt-6 text-center">
            <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Icon path={vaultSvgIcons.lock} class="size-6" />
            </div>
            <h2 class="mt-3 font-semibold text-sm text-slate-900 dark:text-slate-100">Password Protected Send</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter the password provided by the sender to access this content.
            </p>

            <form onSubmit={state.handleUnlockWithPassword} class="mt-6 space-y-4 text-left">
              <div>
                <label for="send-access-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Input
                  id="send-access-password"
                  type="password"
                  value={state.passwordInput()}
                  onInput={(e) => state.setPasswordInput(e.currentTarget.value)}
                  placeholder="Enter Send password"
                  required
                  class="mt-1 w-full"
                />
              </div>

              <Button
                type="submit"
                variant="filled"
                size="sm"
                class="h-8 w-full text-sm"
                disabled={state.isUnlocking()}
              >
                <Icon path={vaultSvgIcons.lock} class="mr-1.5 size-3.5" />
                {state.isUnlocking() ? "Unlocking..." : "Unlock Send"}
              </Button>
            </form>
          </div>
        </Show>

        {/* Content Display */}
        <Show when={!state.isLoading() && state.sendData()}>
          {(send) => (
            <div class="mt-6 space-y-6">
              <div>
                <h2 class="font-bold text-base text-slate-900 dark:text-slate-100">{send().name}</h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Show when={send().creatorIdentifier}>
                    <span>From: {send().creatorIdentifier}</span>
                    <span>•</span>
                  </Show>
                  <Show when={send().expirationDate}>
                    <span>Expires: {new Date(send().expirationDate!).toLocaleString()}</span>
                  </Show>
                </div>
              </div>

              {/* Text send */}
              <Show when={send().type === 0 && send().text}>
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label for="send-access-content" class="font-medium text-sm text-slate-700 dark:text-slate-300">
                      Content
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm"
                      onClick={state.handleCopyText}
                    >
                      <Icon path={state.isCopied() ? vaultSvgIcons.check : vaultSvgIcons.copy} class="mr-1 size-3" />
                      {state.isCopied() ? "Copied!" : "Copy Text"}
                    </Button>
                  </div>
                  <Textarea
                    id="send-access-content"
                    readonly
                    rows={8}
                    value={send().text?.text ?? ""}
                    class="w-full font-mono text-sm"
                  />
                </div>
              </Show>

              {/* File send */}
              <Show when={send().type === 1 && send().file}>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
                        <Icon path={vaultSvgIcons.file} class="size-5" />
                      </div>
                      <div>
                        <p class="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {send().file?.fileName ?? "Download File"}
                        </p>
                        <p class="text-sm text-slate-500 dark:text-slate-400">
                          {send().file?.sizeName ?? (send().file?.size ? `${send().file?.size} bytes` : "Attachment")}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="filled"
                      size="sm"
                      class="h-8 text-sm"
                      onClick={state.handleDownloadFile}
                      disabled={state.isDownloading()}
                    >
                      <Icon path={vaultSvgIcons.download} class="mr-1 size-3.5" />
                      {state.isDownloading() ? "Downloading..." : "Download"}
                    </Button>
                  </div>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </CardWrapper>
    </div>
  )
}
