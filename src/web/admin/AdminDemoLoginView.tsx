import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import { AdminThemeSelector } from "./AdminThemeSelector.jsx"
import { adminDemoLoginViewStateCreate } from "./adminDemoLoginViewStateCreate.js"

export function AdminDemoLoginView(p: { onLogin: (token: string) => void }) {
  const state = adminDemoLoginViewStateCreate(p.onLogin)

  return (
    <main id="main-content" tabindex="-1" class="min-h-[calc(100dvh-3rem)] px-4 py-10 text-sm focus:outline-none">
      <div class="mx-auto max-w-lg">
        <div class="mb-4 flex justify-end">
          <AdminThemeSelector />
        </div>
        <CardWrapper class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div class="text-center">
            <div class="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <Icon path={vaultSvgIcons.lock} class="size-6" />
            </div>
            <Badge variant="filledBlue" class="mt-4 text-sm">
              Interactive demo
            </Badge>
            <h1 class="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">Log in to demo administration</h1>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Explore the admin authorization step without contacting a server.
            </p>
          </div>

          <Show when={state.errorMessage()} keyed>
            {(message) => (
              <div
                role="alert"
                class="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {message}
              </div>
            )}
          </Show>

          <form class="mt-6 space-y-4" onSubmit={state.submit}>
            <div class="space-y-2">
              <label for="demo-admin-token" class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Demo admin token
              </label>
              <Input
                id="demo-admin-token"
                type={state.tokenVisible() ? "text" : "password"}
                value={state.tokenInput()}
                onInput={state.tokenInputChange}
                autocomplete="off"
                placeholder="Enter any demo token"
                class="w-full text-sm"
              />
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Any non-empty token is accepted locally and is never sent or stored.
              </p>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 flex-1 text-sm"
                onClick={state.tokenVisibilityToggle}
                aria-pressed={state.tokenVisible()}
              >
                <Icon path={state.tokenVisible() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye} class="mr-1.5 size-3.5" />
                {state.tokenVisible() ? "Hide token" : "Show token"}
              </Button>
              <Button type="submit" variant="filledBlue" size="sm" class="h-8 flex-1 text-sm">
                <Icon path={vaultSvgIcons.login} class="mr-1.5 size-3.5" />
                Enter admin workspace
              </Button>
            </div>
          </form>
        </CardWrapper>
      </div>
    </main>
  )
}
