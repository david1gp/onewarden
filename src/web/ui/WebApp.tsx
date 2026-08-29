import { type JSX, Match, Switch } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { AuthLoginView } from "../auth/ui/AuthLoginView.jsx"
import { AuthRegisterView } from "../auth/ui/AuthRegisterView.jsx"
import { AuthTwoFactorChallengeView } from "../auth/ui/AuthTwoFactorChallengeView.jsx"
import { AuthTwoFactorSetupView } from "../auth/ui/AuthTwoFactorSetupView.jsx"
import { AuthUnlockView } from "../auth/ui/AuthUnlockView.jsx"
import { AuthVerifyEmailView } from "../auth/ui/AuthVerifyEmailView.jsx"
import { DemoAllItems } from "../demo/DemoAllItems.jsx"
import { DemoDirectory } from "../demo/DemoDirectory.jsx"
import { DemoEmptyState } from "../demo/DemoEmptyState.jsx"
import { DemoLocked } from "../demo/DemoLocked.jsx"
import { DemoSelectedCreditCard } from "../demo/DemoSelectedCreditCard.jsx"
import { DemoSelectedIdentity } from "../demo/DemoSelectedIdentity.jsx"
import { DemoSelectedLogin } from "../demo/DemoSelectedLogin.jsx"
import { DemoSelectedSecureNote } from "../demo/DemoSelectedSecureNote.jsx"
import { DemoTrash } from "../demo/DemoTrash.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import { VaultWorkspace } from "../demo/VaultWorkspace.jsx"
import { webAppStateCreate } from "./webAppStateCreate.js"
import { WebAppShell } from "./WebAppShell.jsx"

export function WebApp(): JSX.Element {
  const state = webAppStateCreate()

  return (
    <Switch>
      <Match when={state.currentRoute() === "directory"}>
        <DemoDirectory />
      </Match>
      <Match when={state.currentRoute() === "all-items"}>
        <DemoAllItems />
      </Match>
      <Match when={state.currentRoute() === "login"}>
        <DemoSelectedLogin />
      </Match>
      <Match when={state.currentRoute() === "secure-note"}>
        <DemoSelectedSecureNote />
      </Match>
      <Match when={state.currentRoute() === "credit-card"}>
        <DemoSelectedCreditCard />
      </Match>
      <Match when={state.currentRoute() === "identity"}>
        <DemoSelectedIdentity />
      </Match>
      <Match when={state.currentRoute() === "empty-state"}>
        <DemoEmptyState />
      </Match>
      <Match when={state.currentRoute() === "trash"}>
        <DemoTrash />
      </Match>
      <Match when={state.currentRoute() === "locked"}>
        <DemoLocked />
      </Match>
      <Match when={state.currentRoute() === "auth-login"}>
        <WebAppShell>
          <AuthLoginView
            session={state.session}
            onSuccess={state.handleAuthSuccess}
            onNavigateToRegister={() => state.navigate("/register")}
            onNavigateToVerify={() => state.navigate("/verify-email")}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "auth-register"}>
        <WebAppShell>
          <AuthRegisterView
            session={state.session}
            onSuccess={state.handleAuthSuccess}
            onNavigateToLogin={() => state.navigate("/login")}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "auth-verify"}>
        <WebAppShell>
          <AuthVerifyEmailView onNavigateToLogin={() => state.navigate("/login")} />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "auth-unlock"}>
        <WebAppShell>
          <AuthUnlockView
            session={state.session}
            onUnlocked={state.handleAuthSuccess}
            onLoggedOut={() => state.navigate("/login")}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "auth-two-factor-challenge"}>
        <WebAppShell>
          <AuthTwoFactorChallengeView
            session={state.session}
            onSuccess={state.handleAuthSuccess}
            onCancel={() => state.navigate("/login")}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "auth-two-factor-setup"}>
        <WebAppShell>
          <AuthTwoFactorSetupView session={state.session} onBack={() => state.navigate("/")} />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "root"}>
        <Switch>
          <Match when={state.session.isUnauthenticated()}>
            <WebAppShell>
              <AuthLoginView
                session={state.session}
                onSuccess={state.handleAuthSuccess}
                onNavigateToRegister={() => state.navigate("/register")}
                onNavigateToVerify={() => state.navigate("/verify-email")}
              />
            </WebAppShell>
          </Match>
          <Match when={state.session.isLocked()}>
            <WebAppShell>
              <AuthUnlockView
                session={state.session}
                onUnlocked={state.handleAuthSuccess}
                onLoggedOut={() => state.navigate("/login")}
              />
            </WebAppShell>
          </Match>
          <Match when={state.session.isUnlocked()}>
            <WebAppShell
              headerAction={
                <div class="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-3">
                  <span class="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300 sm:max-w-56 sm:flex-none">
                    {state.session.session()?.email}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    class="shrink-0 text-xs"
                    onClick={() => state.navigate("/two-factor")}
                  >
                    <Icon path={vaultSvgIcons.twoFactor} class="mr-1 size-3.5" />
                    Two-Step Login
                  </Button>
                  <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={state.handleLockVault}>
                    <Icon path={vaultSvgIcons.lock} class="mr-1 size-3.5" />
                    Lock Vault
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="shrink-0 text-xs text-red-600 dark:text-red-400"
                    onClick={state.handleLogout}
                  >
                    Log Out
                  </Button>
                </div>
              }
            >
              <div class="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden">
                <div class="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div class="flex min-w-0 items-start gap-2">
                    <Icon path={vaultSvgIcons.shieldCheck} class="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span class="break-words">Vault Unlocked &amp; Decrypted ({state.session.session()?.email})</span>
                  </div>
                </div>
                <div class="flex-1 overflow-hidden">
                  <VaultWorkspace />
                </div>
              </div>
            </WebAppShell>
          </Match>
        </Switch>
      </Match>
    </Switch>
  )
}
import { DemoAdmin } from "../demo/DemoAdmin.jsx"
      <Match when={state.currentRoute() === "admin"}>
        <DemoAdmin />
      </Match>
