import { type JSX, Show, Suspense } from "solid-js"
import { Dynamic } from "solid-js/web"
import { LoadingPage } from "#ui/static/loaders/LoadingPage.jsx"
import { WebAppNavHeaderActions } from "./WebAppNavHeaderActions.jsx"
import { WebAppShell } from "./WebAppShell.jsx"
import { webAppRouteHostStateCreate } from "./webAppRouteHostStateCreate.js"
import type { webAppStateCreate } from "./webAppStateCreate.js"

export function WebAppRouteHost(props: { readonly state: ReturnType<typeof webAppStateCreate> }): JSX.Element {
  const state = webAppRouteHostStateCreate(props)

  return (
    <Show
      when={!state.isSessionLoading()}
      fallback={
        <WebAppShell>
          <div role="status">
            <LoadingPage loadingItem="session" />
          </div>
        </WebAppShell>
      }
    >
      <Show
        when={!state.isAdminSessionChecking()}
        fallback={
          <WebAppShell>
            <div class="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600 dark:text-slate-300">
              Checking admin session...
            </div>
          </WebAppShell>
        }
      >
        <Suspense
          fallback={
            <div role="status">
              <LoadingPage loadingItem="page" />
            </div>
          }
        >
          <Show when={state.isShellRoute()} fallback={<Dynamic component={state.routeComponent()} />}>
            <WebAppShell
              headerAction={
                <Show when={state.isNavigationHeaderActionsVisible()}>
                  <WebAppNavHeaderActions
                    email={state.email}
                    onNavigateToVault={state.navigateToVault}
                    onNavigateToSends={state.navigateToSends}
                    onNavigateToEmergencyAccess={state.navigateToEmergencyAccess}
                    onNavigateToSettings={state.navigateToSettings}
                    onNavigateToTwoFactor={state.navigateToTwoFactor}
                    onLockVault={state.lockVault}
                    onLogout={state.logout}
                  />
                </Show>
              }
            >
              <Dynamic component={state.routeComponent()} />
            </WebAppShell>
          </Show>
        </Suspense>
      </Show>
    </Show>
  )
}
