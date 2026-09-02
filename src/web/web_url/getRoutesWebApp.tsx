import { type JSX, lazy } from "solid-js"
import { getRoutesDemo } from "../demo/demo_url/getRoutesDemo.jsx"
import type { PageNameDemo } from "../demo/demo_url/pageNameDemo.js"
import { vaultDemoData } from "../demo/vaultDemoData.js"
import type { webAppStateCreate } from "../ui/webAppStateCreate.js"
import type { PageNameWebApp } from "./pageNameWebApp.js"
import { pageNameWebApp } from "./pageNameWebApp.js"
import type { PageRouteWebApp } from "./pageRouteWebApp.js"
import { pageRouteWebApp } from "./pageRouteWebApp.js"
import { urlWebApp } from "./urlWebApp.js"

const AdminDashboardView = lazy(() =>
  import("../admin/ui/AdminDashboardView.jsx").then((module) => ({ default: module.AdminDashboardView })),
)
const AdminLoginView = lazy(() =>
  import("../admin/ui/AdminLoginView.jsx").then((module) => ({ default: module.AdminLoginView })),
)
const AuthLoginView = lazy(() =>
  import("../auth/ui/AuthLoginView.jsx").then((module) => ({ default: module.AuthLoginView })),
)
const AuthRegisterView = lazy(() =>
  import("../auth/ui/AuthRegisterView.jsx").then((module) => ({ default: module.AuthRegisterView })),
)
const AuthSsoConnectorView = lazy(() =>
  import("../sso/ui/AuthSsoConnectorView.jsx").then((module) => ({ default: module.AuthSsoConnectorView })),
)
const AuthTwoFactorChallengeView = lazy(() =>
  import("../auth/ui/AuthTwoFactorChallengeView.jsx").then((module) => ({
    default: module.AuthTwoFactorChallengeView,
  })),
)
const AuthTwoFactorSetupView = lazy(() =>
  import("../auth/ui/AuthTwoFactorSetupView.jsx").then((module) => ({ default: module.AuthTwoFactorSetupView })),
)
const AuthUnlockView = lazy(() =>
  import("../auth/ui/AuthUnlockView.jsx").then((module) => ({ default: module.AuthUnlockView })),
)
const AuthVerifyEmailView = lazy(() =>
  import("../auth/ui/AuthVerifyEmailView.jsx").then((module) => ({ default: module.AuthVerifyEmailView })),
)
const CipherPage = lazy(() => import("../ciphers/ui/CipherPage.jsx").then((module) => ({ default: module.CipherPage })))
const EmergencyAccessView = lazy(() =>
  import("../emergencyAccess/ui/EmergencyAccessView.jsx").then((module) => ({ default: module.EmergencyAccessView })),
)
const OrganizationWorkspace = lazy(() =>
  import("../organizations/ui/OrganizationWorkspace.jsx").then((module) => ({ default: module.OrganizationWorkspace })),
)
const SendAccessView = lazy(() =>
  import("../sends/ui/SendAccessView.jsx").then((module) => ({ default: module.SendAccessView })),
)
const SendListView = lazy(() =>
  import("../sends/ui/SendListView.jsx").then((module) => ({ default: module.SendListView })),
)
const SettingsView = lazy(() =>
  import("../settings/ui/SettingsView.jsx").then((module) => ({ default: module.SettingsView })),
)
const VaultShell = lazy(() => import("../vault/ui/VaultShell.jsx").then((module) => ({ default: module.VaultShell })))

type WebAppState = ReturnType<typeof webAppStateCreate>
type WebAppRouteComponent = () => JSX.Element
type WebAppRouteGate = "none" | "auth-unlock" | "auth-unlocked" | "admin"
type WebAppRouteShell = "none" | "web"
type WebAppRoute = Readonly<{
  readonly pageName: PageNameWebApp | PageNameDemo
  readonly path: string
  readonly component: WebAppRouteComponent
  readonly gate: WebAppRouteGate
  readonly shell: WebAppRouteShell
}>

export function getRoutesWebApp(input: Readonly<{ readonly state: WebAppState }>): readonly WebAppRoute[] {
  const { state } = input
  const authLogin = () => (
    <AuthLoginView
      session={state.session}
      onSuccess={state.handleAuthSuccess}
      onNavigateToRegister={() => state.navigate(urlWebApp(pageNameWebApp.authRegister))}
      onNavigateToVerify={() => state.navigate(urlWebApp(pageNameWebApp.authVerify))}
    />
  )
  const adminLogin = () => (
    <AdminLoginView
      onLoginSuccess={state.handleAdminLoginSuccess}
      onNavigateHome={() => state.navigate(urlWebApp(pageNameWebApp.root))}
    />
  )

  const routeMapping = {
    root: {
      pageName: pageNameWebApp.root,
      path: pageRouteWebApp.root,
      component: () => (
        <VaultShell
          initialItems={vaultDemoData}
          onOpenOrganizations={() => state.navigate(urlWebApp(pageNameWebApp.organizations))}
          onOpenSends={() => state.navigate(urlWebApp(pageNameWebApp.sends))}
          onOpenEmergencyAccess={() => state.navigate(urlWebApp(pageNameWebApp.emergencyAccess))}
          onOpenSettings={() => state.navigate(urlWebApp(pageNameWebApp.settings))}
          onLock={state.handleLockVault}
          onLogout={state.handleLogout}
          pathname={state.pathname}
          search={state.search}
          hash={state.hash}
          navigateReplace={state.navigateReplace}
        />
      ),
      gate: "auth-unlocked",
      shell: "none",
    },
    authLogin: {
      pageName: pageNameWebApp.authLogin,
      path: pageRouteWebApp.authLogin,
      component: authLogin,
      gate: "none",
      shell: "web",
    },
    authRegister: {
      pageName: pageNameWebApp.authRegister,
      path: pageRouteWebApp.authRegister,
      component: () => (
        <AuthRegisterView
          session={state.session}
          onSuccess={state.handleAuthSuccess}
          onNavigateToLogin={() => state.navigate(urlWebApp(pageNameWebApp.authLogin))}
        />
      ),
      gate: "none",
      shell: "web",
    },
    authVerify: {
      pageName: pageNameWebApp.authVerify,
      path: pageRouteWebApp.authVerify,
      component: () => (
        <AuthVerifyEmailView onNavigateToLogin={() => state.navigate(urlWebApp(pageNameWebApp.authLogin))} />
      ),
      gate: "none",
      shell: "web",
    },
    authUnlock: {
      pageName: pageNameWebApp.authUnlock,
      path: pageRouteWebApp.authUnlock,
      component: () => (
        <AuthUnlockView
          session={state.session}
          onUnlocked={state.handleVaultUnlocked}
          onLoggedOut={() => state.navigate(urlWebApp(pageNameWebApp.authLogin))}
        />
      ),
      gate: "auth-unlock",
      shell: "web",
    },
    authTwoFactorSetup: {
      pageName: pageNameWebApp.authTwoFactorSetup,
      path: pageRouteWebApp.authTwoFactorSetup,
      component: () => (
        <AuthTwoFactorSetupView session={state.session} onBack={() => state.navigate(urlWebApp(pageNameWebApp.root))} />
      ),
      gate: "none",
      shell: "web",
    },
    authTwoFactorChallenge: {
      pageName: pageNameWebApp.authTwoFactorChallenge,
      path: pageRouteWebApp.authTwoFactorChallenge,
      component: () => (
        <AuthTwoFactorChallengeView
          session={state.session}
          onSuccess={state.handleAuthSuccess}
          onCancel={() => state.navigate(urlWebApp(pageNameWebApp.authLogin))}
        />
      ),
      gate: "none",
      shell: "web",
    },
    ssoConnector: {
      pageName: pageNameWebApp.ssoConnector,
      path: pageRouteWebApp.ssoConnector,
      component: () => (
        <AuthSsoConnectorView
          session={state.session}
          onNavigateToUnlock={() => state.navigateReplace(urlWebApp(pageNameWebApp.authUnlock))}
          onNavigateToLogin={() => state.navigate(urlWebApp(pageNameWebApp.authLogin))}
          pathname={state.pathname}
          search={state.search}
          hash={state.hash}
          navigateReplace={state.navigateReplace}
        />
      ),
      gate: "none",
      shell: "web",
    },
    cipherCreate: {
      pageName: pageNameWebApp.cipherCreate,
      path: pageRouteWebApp.cipherCreate,
      component: () => (
        <CipherPage
          initialMode={() => "create"}
          defaultUri={state.currentCipherCreateUri}
          onNavigateBack={() => state.navigate(urlWebApp(pageNameWebApp.root))}
        />
      ),
      gate: "auth-unlocked",
      shell: "web",
    },
    cipherEdit: {
      pageName: pageNameWebApp.cipherEdit,
      path: pageRouteWebApp.cipherEdit,
      component: () => (
        <CipherPage
          cipherId={state.routeCipherId}
          initialMode={() => "edit"}
          onNavigateBack={() => state.navigate(urlWebApp(pageNameWebApp.root))}
        />
      ),
      gate: "auth-unlocked",
      shell: "web",
    },
    cipherView: {
      pageName: pageNameWebApp.cipherView,
      path: pageRouteWebApp.cipherView,
      component: () => (
        <CipherPage
          cipherId={state.routeCipherId}
          initialMode={() => "view"}
          onNavigateBack={() => state.navigate(urlWebApp(pageNameWebApp.root))}
        />
      ),
      gate: "auth-unlocked",
      shell: "web",
    },
    settings: {
      pageName: pageNameWebApp.settings,
      path: pageRouteWebApp.settings,
      component: () => (
        <SettingsView
          session={state.session}
          onNavigateToVault={() => state.navigate(urlWebApp(pageNameWebApp.root))}
          onNavigateToTwoFactor={() => state.navigate(urlWebApp(pageNameWebApp.authTwoFactorSetup))}
          onLoggedOut={() => state.navigate(urlWebApp(pageNameWebApp.authLogin))}
          pathname={state.pathname}
          search={state.search}
          hash={state.hash}
          navigateReplace={state.navigateReplace}
        />
      ),
      gate: "auth-unlocked",
      shell: "web",
    },
    sends: {
      pageName: pageNameWebApp.sends,
      path: pageRouteWebApp.sends,
      component: () => (
        <SendListView
          session={state.session}
          onNavigateToVault={() => state.navigate(urlWebApp(pageNameWebApp.root))}
          onNavigateToSendAccess={(accessId) =>
            state.navigate(urlWebApp(pageNameWebApp.sendAccess, { sendAccessId: accessId }))
          }
          navigate={state.navigate}
        />
      ),
      gate: "auth-unlocked",
      shell: "web",
    },
    sendAccess: {
      pageName: pageNameWebApp.sendAccess,
      path: pageRouteWebApp.sendAccess,
      component: () => (
        <SendAccessView
          accessId={state.currentSendAccessId}
          onNavigateHome={() => state.navigate(urlWebApp(pageNameWebApp.root))}
        />
      ),
      gate: "none",
      shell: "web",
    },
    emergencyAccess: {
      pageName: pageNameWebApp.emergencyAccess,
      path: pageRouteWebApp.emergencyAccess,
      component: () => (
        <EmergencyAccessView
          session={state.session}
          onNavigateToVault={() => state.navigate(urlWebApp(pageNameWebApp.root))}
        />
      ),
      gate: "auth-unlocked",
      shell: "web",
    },
    adminLogin: {
      pageName: pageNameWebApp.adminLogin,
      path: pageRouteWebApp.adminLogin,
      component: adminLogin,
      gate: "none",
      shell: "web",
    },
    admin: {
      pageName: pageNameWebApp.admin,
      path: pageRouteWebApp.admin,
      component: () => (
        <AdminDashboardView
          onLogout={state.handleAdminLogout}
          onNavigateHome={() => state.navigate(urlWebApp(pageNameWebApp.root))}
          pathname={state.pathname}
          search={state.search}
          hash={state.hash}
          navigateReplace={state.navigateReplace}
        />
      ),
      gate: "admin",
      shell: "web",
    },
    organizations: {
      pageName: pageNameWebApp.organizations,
      path: pageRouteWebApp.organizations,
      component: () => (
        <OrganizationWorkspace
          apiClientOptions={{ token: () => state.session.session()?.accessToken ?? null }}
          useDemoFallback={false}
          pathname={state.pathname}
          search={state.search}
          hash={state.hash}
          navigateReplace={state.navigateReplace}
        />
      ),
      gate: "none",
      shell: "none",
    },
  } as const satisfies Record<PageRouteWebApp, WebAppRoute>

  return [...Object.values(routeMapping), ...getRoutesDemo({ state })]
}
