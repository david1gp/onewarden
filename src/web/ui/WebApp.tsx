import { type JSX, Match, Switch } from "solid-js"
import { AuthLoginView } from "../auth/ui/AuthLoginView.jsx"
import { AuthRegisterView } from "../auth/ui/AuthRegisterView.jsx"
import { AuthTwoFactorChallengeView } from "../auth/ui/AuthTwoFactorChallengeView.jsx"
import { AuthTwoFactorSetupView } from "../auth/ui/AuthTwoFactorSetupView.jsx"
import { AuthUnlockView } from "../auth/ui/AuthUnlockView.jsx"
import { AuthVerifyEmailView } from "../auth/ui/AuthVerifyEmailView.jsx"
import { DemoAdmin } from "../demo/DemoAdmin.jsx"
import { DemoAllItems } from "../demo/DemoAllItems.jsx"
import { DemoDirectory } from "../demo/DemoDirectory.jsx"
import { DemoEmptyState } from "../demo/DemoEmptyState.jsx"
import { DemoLocked } from "../demo/DemoLocked.jsx"
import { DemoSelectedCreditCard } from "../demo/DemoSelectedCreditCard.jsx"
import { DemoSelectedIdentity } from "../demo/DemoSelectedIdentity.jsx"
import { DemoSelectedLogin } from "../demo/DemoSelectedLogin.jsx"
import { DemoSelectedSecureNote } from "../demo/DemoSelectedSecureNote.jsx"
import { DemoSelectedSshKey } from "../demo/DemoSelectedSshKey.jsx"
import { DemoTrash } from "../demo/DemoTrash.jsx"
import { vaultDemoData } from "../demo/vaultDemoData.js"
import { VaultShell } from "../vault/ui/VaultShell.jsx"
import { webAppStateCreate } from "./webAppStateCreate.js"
import { WebAppShell } from "./WebAppShell.jsx"

export function WebApp(): JSX.Element {
  const state = webAppStateCreate()

  return (
    <Switch>
      <Match when={state.currentRoute() === "directory"}>
        <DemoDirectory />
      </Match>
      <Match when={state.currentRoute() === "admin"}>
        <DemoAdmin />
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
      <Match when={state.currentRoute() === "ssh-key"}>
        <DemoSelectedSshKey />
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
            <VaultShell initialItems={vaultDemoData} />
          </Match>
        </Switch>
      </Match>
    </Switch>
  )
}
