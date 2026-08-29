import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AdminLoginViewProps, adminLoginViewStateCreate } from "./adminLoginViewStateCreate.js"

export function AdminLoginView(props: AdminLoginViewProps): JSX.Element {
  const state = adminLoginViewStateCreate(props)

  return (
    <div class="mx-auto max-w-md px-4 py-16">
      <CardWrapper class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div class="text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Icon path={vaultSvgIcons.cog} class="size-6" />
          </div>
          <h1 class="mt-4 font-bold text-xl text-slate-900 dark:text-slate-100">OneWarden Admin</h1>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter your admin authorization token to manage this instance
          </p>
        </div>

        <Show when={state.errorMessage()}>
          {(msg) => (
            <div
              role="alert"
              class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
            >
              {msg()}
            </div>
          )}
        </Show>

        <form onSubmit={state.handleSubmit} class="mt-6 space-y-4 text-xs">
          <div>
            <label for="admin-token-input" class="block font-medium text-slate-700 dark:text-slate-300">
              Admin Token
            </label>
            <Input
              id="admin-token-input"
              type="password"
              value={state.tokenInput()}
              onInput={(e) => state.setTokenInput(e.currentTarget.value)}
              placeholder="Enter ADMIN_TOKEN"
              required
              class="mt-1 w-full"
            />
          </div>

          <Button type="submit" variant="filled" size="sm" class="w-full text-xs" disabled={state.isLoading()}>
            {state.isLoading() ? "Authenticating..." : "Log In to Admin Panel"}
          </Button>

          <Show when={props.onNavigateHome}>
            <div class="pt-2 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={state.handleNavigateHome}
                class="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Back to Vault
              </Button>
            </div>
          </Show>
        </form>
      </CardWrapper>
    </div>
  )
}
