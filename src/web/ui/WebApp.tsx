import { type JSX, Match, Switch } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { AdminDashboardView } from "../admin/ui/AdminDashboardView.jsx"
import { AdminLoginView } from "../admin/ui/AdminLoginView.jsx"
import { AuthLoginView } from "../auth/ui/AuthLoginView.jsx"
import { AuthRegisterView } from "../auth/ui/AuthRegisterView.jsx"
import { AuthTwoFactorChallengeView } from "../auth/ui/AuthTwoFactorChallengeView.jsx"
import { AuthTwoFactorSetupView } from "../auth/ui/AuthTwoFactorSetupView.jsx"
import { AuthUnlockView } from "../auth/ui/AuthUnlockView.jsx"
import { AuthVerifyEmailView } from "../auth/ui/AuthVerifyEmailView.jsx"
import { CipherPage } from "../ciphers/ui/CipherPage.jsx"
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
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import { EmergencyAccessView } from "../emergencyAccess/ui/EmergencyAccessView.jsx"
import { OrganizationWorkspace } from "../organizations/ui/OrganizationWorkspace.jsx"
import { SendAccessView } from "../sends/ui/SendAccessView.jsx"
import { SendListView } from "../sends/ui/SendListView.jsx"
import { SettingsView } from "../settings/ui/SettingsView.jsx"
import { VaultShell } from "../vault/ui/VaultShell.jsx"
import { WebAppShell } from "./WebAppShell.jsx"
import { webAppStateCreate } from "./webAppStateCreate.js"

export function WebApp(): JSX.Element {
  const state = webAppStateCreate()

  const navHeaderActions = () => (
    <div class="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-2.5">
      <span class="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-300 sm:max-w-56 sm:flex-none">
        {state.session.session()?.email}
      </span>
      <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={() => state.navigate("/")}>
        <Icon path={vaultSvgIcons.personalVault} class="mr-1 size-3.5" />
        Vault
      </Button>
      <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={() => state.navigate("/sends")}>
        <Icon path={vaultSvgIcons.send} class="mr-1 size-3.5" />
        Send
      </Button>
      <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={() => state.navigate("/emergency-access")}>
        <Icon path={vaultSvgIcons.lifebuoy} class="mr-1 size-3.5" />
        Emergency
      </Button>
      <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={() => state.navigate("/settings")}>
        <Icon path={vaultSvgIcons.server} class="mr-1 size-3.5" />
        Settings
      </Button>
      <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={() => state.navigate("/two-factor")}>
        <Icon path={vaultSvgIcons.twoFactor} class="mr-1 size-3.5" />
        2FA
      </Button>
      <Button variant="outline" size="sm" class="shrink-0 text-xs" onClick={state.handleLockVault}>
        <Icon path={vaultSvgIcons.lock} class="mr-1 size-3.5" />
        Lock
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
  )

  return (
    <Switch>
      <Match when={state.currentRoute() === "organizations"}>
        <OrganizationWorkspace
          apiClientOptions={{ token: () => state.session.session()?.accessToken ?? null }}
          useDemoFallback={false}
        />
      </Match>
      <Match when={state.currentRoute() === "directory"}>
        <DemoDirectory />
      </Match>
      <Match when={state.currentRoute() === "admin" && state.pathname().toLowerCase().startsWith("/demo/")}>
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
            onUnlocked={state.handleVaultUnlocked}
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
      <Match when={state.currentRoute() === "cipher-create"}>
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
                onUnlocked={state.handleVaultUnlocked}
                onLoggedOut={() => state.navigate("/login")}
              />
            </WebAppShell>
          </Match>
          <Match when={state.session.isUnlocked()}>
            <WebAppShell>
              <CipherPage initialMode={() => "create"} onNavigateBack={() => state.navigate("/")} />
            </WebAppShell>
          </Match>
        </Switch>
      </Match>
      <Match when={state.currentRoute() === "cipher-edit"}>
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
                onUnlocked={state.handleVaultUnlocked}
                onLoggedOut={() => state.navigate("/login")}
              />
            </WebAppShell>
          </Match>
          <Match when={state.session.isUnlocked()}>
            <WebAppShell>
              <CipherPage
                cipherId={state.routeCipherId}
                initialMode={() => "edit"}
                onNavigateBack={() => state.navigate("/")}
              />
            </WebAppShell>
          </Match>
        </Switch>
      </Match>
      <Match
        when={
          state.session.isUnauthenticated() &&
          (state.currentRoute() === "sends" ||
            state.currentRoute() === "emergency-access" ||
            state.currentRoute() === "settings")
        }
      >
        <WebAppShell>
          <AuthLoginView
            session={state.session}
            onSuccess={state.handleAuthSuccess}
            onNavigateToRegister={() => state.navigate("/register")}
            onNavigateToVerify={() => state.navigate("/verify-email")}
          />
        </WebAppShell>
      </Match>
      <Match
        when={
          state.session.isLocked() &&
          (state.currentRoute() === "sends" ||
            state.currentRoute() === "emergency-access" ||
            state.currentRoute() === "settings")
        }
      >
        <WebAppShell>
          <AuthUnlockView
            session={state.session}
            onUnlocked={state.handleVaultUnlocked}
            onLoggedOut={() => state.navigate("/login")}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "sends"}>
        <WebAppShell headerAction={navHeaderActions()}>
          <SendListView
            session={state.session}
            onNavigateToVault={() => state.navigate("/")}
            onNavigateToSendAccess={(accessId) => state.navigate(`/send/${accessId}`)}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "send-access"}>
        <WebAppShell>
          <SendAccessView accessId={state.currentSendAccessId} onNavigateHome={() => state.navigate("/")} />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "emergency-access"}>
        <WebAppShell headerAction={navHeaderActions()}>
          <EmergencyAccessView session={state.session} onNavigateToVault={() => state.navigate("/")} />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "admin-login"}>
        <WebAppShell>
          <AdminLoginView onLoginSuccess={state.handleAdminLoginSuccess} onNavigateHome={() => state.navigate("/")} />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "admin" && state.pathname().toLowerCase().startsWith("/admin-ui")}>
        <WebAppShell>
          <Switch>
            <Match when={state.isAdminSessionChecking()}>
              <div class="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600 dark:text-slate-300">
                Checking admin session...
              </div>
            </Match>
            <Match when={state.isAdminLoggedIn()}>
              <AdminDashboardView onLogout={state.handleAdminLogout} onNavigateHome={() => state.navigate("/")} />
            </Match>
            <Match when={!state.isAdminLoggedIn()}>
              <AdminLoginView
                onLoginSuccess={state.handleAdminLoginSuccess}
                onNavigateHome={() => state.navigate("/")}
              />
            </Match>
          </Switch>
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "settings"}>
        <WebAppShell headerAction={navHeaderActions()}>
          <SettingsView
            session={state.session}
            onNavigateToVault={() => state.navigate("/")}
            onNavigateToTwoFactor={() => state.navigate("/two-factor")}
            onLoggedOut={() => state.navigate("/login")}
          />
        </WebAppShell>
      </Match>
      <Match when={state.currentRoute() === "cipher-view"}>
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
                onUnlocked={state.handleVaultUnlocked}
                onLoggedOut={() => state.navigate("/login")}
              />
            </WebAppShell>
          </Match>
          <Match when={state.session.isUnlocked()}>
            <WebAppShell>
              <CipherPage
                cipherId={state.routeCipherId}
                initialMode={() => "view"}
                onNavigateBack={() => state.navigate("/")}
              />
            </WebAppShell>
          </Match>
        </Switch>
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
                onUnlocked={state.handleVaultUnlocked}
                onLoggedOut={() => state.navigate("/login")}
              />
            </WebAppShell>
          </Match>
          <Match when={state.session.isUnlocked()}>
            <VaultShell
              initialItems={vaultDemoData}
              onOpenOrganizations={() => state.navigate("/organizations")}
              onOpenSends={() => state.navigate("/sends")}
              onOpenEmergencyAccess={() => state.navigate("/emergency-access")}
              onOpenSettings={() => state.navigate("/settings")}
              onLock={state.handleLockVault}
              onLogout={state.handleLogout}
            />
          </Match>
        </Switch>
      </Match>
    </Switch>
  )
}
