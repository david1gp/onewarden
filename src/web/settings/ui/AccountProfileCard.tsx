import { type JSX, Show } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { CodeBlock } from "#ui/static/code/CodeBlock.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AccountProfileCardProps, accountProfileCardStateCreate } from "./accountProfileCardStateCreate.js"

export function AccountProfileCard(props: AccountProfileCardProps): JSX.Element {
  const state = accountProfileCardStateCreate(props)

  return (
    <div class="space-y-6">
      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div
              class="flex size-11 items-center justify-center rounded-full text-white font-bold text-base shadow-xs"
              role="img"
              aria-label="Profile avatar"
              style={{ "background-color": state.avatarColorInput() || "#1d4ed8" }}
            >
              <Icon path={vaultSvgIcons.personalVault} class="size-6" aria-hidden="true" />
            </div>
            <div>
              <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">My Profile</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">Manage your basic account identity</p>
            </div>
          </div>
          <Show when={state.profile()?.emailVerified}>
            <Badge variant="subtle" class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Verified
            </Badge>
          </Show>
        </div>

        <form onSubmit={state.handleSaveProfile} class="mt-6 space-y-4">
          <div>
            <Label for="profile-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email Address
            </Label>
            <div class="mt-1 flex items-center gap-2">
              <Input
                id="profile-email"
                type="email"
                disabled={true}
                value={state.profile()?.email ?? ""}
                class="h-9 w-full max-w-md rounded-md border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
              />
              <Show when={state.profile() && !state.profile()?.emailVerified}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-9 shrink-0 text-sm text-amber-800 dark:text-amber-300"
                  onClick={state.handleSendVerificationEmail}
                  disabled={state.isSendingVerification()}
                >
                  <Icon path={vaultSvgIcons.email} class="mr-1.5 size-3.5" />
                  {state.isSendingVerification() ? "Sending..." : "Verify Email"}
                </Button>
              </Show>
            </div>
          </div>

          <div>
            <Label for="profile-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display Name
            </Label>
            <div class="mt-1">
              <Input
                id="profile-name"
                type="text"
                placeholder="Enter your name"
                value={state.nameInput()}
                onInput={(e) => state.setNameInput(e.currentTarget.value)}
                maxLength={50}
                class="h-9 w-full max-w-md rounded-md border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label for="profile-avatar" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Avatar Accent Color
            </Label>
            <div class="mt-1 flex items-center gap-3">
              <input
                id="profile-avatar"
                type="color"
                value={state.avatarColorInput()}
                onInput={(e) => state.setAvatarColorInput(e.currentTarget.value)}
                class="h-9 w-14 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5 dark:border-slate-700"
              />
              <span class="font-mono text-sm text-slate-600 dark:text-slate-400">{state.avatarColorInput()}</span>
            </div>
          </div>

          <div class="pt-2">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-sm" disabled={state.isSaving()}>
              <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
              {state.isSaving() ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </CardWrapper>

      {/* Account API Key Card */}
      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Icon path={vaultSvgIcons.key} class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">API Key</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Access your vault programmatically via the Bitwarden CLI or SDK
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" class="h-8 text-sm" onClick={state.openApiKeyDialog}>
            <Icon path={vaultSvgIcons.key} class="mr-1.5 size-3.5" />
            View API Key
          </Button>
        </div>

        <Show when={state.isApiKeyDialogOpen()}>
          <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Account API Credentials</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-8 px-2 text-sm"
                onClick={state.closeApiKeyDialog}
              >
                <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                Close
              </Button>
            </div>

            <Show when={state.apiKeyError()}>
              {(err) => (
                <div
                  role="alert"
                  class="mb-3 rounded border border-red-200 bg-red-50 p-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                  {err()}
                </div>
              )}
            </Show>

            <Show
              when={state.apiKeyData()}
              fallback={
                <div class="space-y-3">
                  <p class="text-sm text-slate-600 dark:text-slate-400">
                    Enter your master password to decrypt and view your account API key.
                  </p>
                  <div class="flex max-w-md items-center gap-2">
                    <Input
                      type="password"
                      placeholder="Master password"
                      value={state.apiKeyPasswordInput()}
                      onInput={(e) => state.setApiKeyPasswordInput(e.currentTarget.value)}
                      class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    <Button
                      type="button"
                      variant="filled"
                      size="sm"
                      class="h-9 shrink-0 text-sm"
                      onClick={() => state.handleFetchApiKey(false)}
                      disabled={state.isApiKeyLoading()}
                    >
                      <Icon path={vaultSvgIcons.eye} class="mr-1.5 size-3.5" />
                      {state.isApiKeyLoading() ? "Verifying..." : "Reveal Key"}
                    </Button>
                  </div>
                </div>
              }
            >
              {(keyData) => (
                <div class="space-y-3">
                  <div>
                    <Label class="block text-sm font-medium text-slate-500">client_id</Label>
                    <div class="mt-0.5 font-mono text-sm text-slate-800 dark:text-slate-200">
                      user.{state.profile()?.id}
                    </div>
                  </div>
                  <div>
                    <Label class="block text-sm font-medium text-slate-500">client_secret (API Key)</Label>
                    <div class="mt-0.5">
                      <CodeBlock data={keyData().apiKey} />
                    </div>
                  </div>
                  <div class="pt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm text-amber-800 dark:text-amber-300"
                      onClick={() => state.handleFetchApiKey(true)}
                      disabled={state.isApiKeyLoading()}
                    >
                      <Icon path={vaultSvgIcons.refresh} class="mr-1.5 size-3.5" />
                      {state.isApiKeyLoading() ? "Rotating..." : "Rotate API Key"}
                    </Button>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </Show>
      </CardWrapper>
    </div>
  )
}
