import { type JSX, lazy } from "solid-js"
import type { webAppStateCreate } from "../../ui/webAppStateCreate.js"
import type { PageNameDemo } from "./pageNameDemo.js"
import { pageNameDemo } from "./pageNameDemo.js"
import type { PageRouteDemo } from "./pageRouteDemo.js"
import { pageRouteDemo } from "./pageRouteDemo.js"

const DemoAdmin = lazy(() => import("../DemoAdmin.jsx").then((module) => ({ default: module.DemoAdmin })))
const DemoAllItems = lazy(() => import("../DemoAllItems.jsx").then((module) => ({ default: module.DemoAllItems })))
const DemoDirectory = lazy(() => import("../DemoDirectory.jsx").then((module) => ({ default: module.DemoDirectory })))
const DemoEmptyState = lazy(() =>
  import("../DemoEmptyState.jsx").then((module) => ({ default: module.DemoEmptyState })),
)
const DemoLocked = lazy(() => import("../DemoLocked.jsx").then((module) => ({ default: module.DemoLocked })))
const DemoSelectedCreditCard = lazy(() =>
  import("../DemoSelectedCreditCard.jsx").then((module) => ({ default: module.DemoSelectedCreditCard })),
)
const DemoSelectedIdentity = lazy(() =>
  import("../DemoSelectedIdentity.jsx").then((module) => ({ default: module.DemoSelectedIdentity })),
)
const DemoSelectedLogin = lazy(() =>
  import("../DemoSelectedLogin.jsx").then((module) => ({ default: module.DemoSelectedLogin })),
)
const DemoSelectedSecureNote = lazy(() =>
  import("../DemoSelectedSecureNote.jsx").then((module) => ({ default: module.DemoSelectedSecureNote })),
)
const DemoSelectedSshKey = lazy(() =>
  import("../DemoSelectedSshKey.jsx").then((module) => ({ default: module.DemoSelectedSshKey })),
)
const DemoSettings = lazy(() => import("../DemoSettings.jsx").then((module) => ({ default: module.DemoSettings })))
const DemoTrash = lazy(() => import("../DemoTrash.jsx").then((module) => ({ default: module.DemoTrash })))
const ExtensionDemo = lazy(() =>
  import("../extension/ExtensionDemo.jsx").then((module) => ({ default: module.ExtensionDemo })),
)

type WebAppState = ReturnType<typeof webAppStateCreate>
type DemoRouteComponent = () => JSX.Element
type DemoRouteGate = "none"
type DemoRouteShell = "none"
type DemoRoute = Readonly<{
  readonly pageName: PageNameDemo
  readonly path: string
  readonly component: DemoRouteComponent
  readonly gate: DemoRouteGate
  readonly shell: DemoRouteShell
}>

export function getRoutesDemo(input: Readonly<{ readonly state: WebAppState }>): readonly DemoRoute[] {
  const routeMapping = {
    directory: {
      pageName: pageNameDemo.directory,
      path: pageRouteDemo.directory,
      component: () => <DemoDirectory navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    extensionDemo: {
      pageName: pageNameDemo.extensionDemo,
      path: pageRouteDemo.extensionDemo,
      component: () => <ExtensionDemo />,
      gate: "none",
      shell: "none",
    },
    demoSettings: {
      pageName: pageNameDemo.demoSettings,
      path: pageRouteDemo.demoSettings,
      component: () => (
        <DemoSettings
          pathname={input.state.pathname}
          search={input.state.search}
          hash={input.state.hash}
          navigate={input.state.navigate}
        />
      ),
      gate: "none",
      shell: "none",
    },
    admin: {
      pageName: pageNameDemo.admin,
      path: pageRouteDemo.admin,
      component: () => (
        <DemoAdmin
          pathname={input.state.pathname}
          search={input.state.search}
          hash={input.state.hash}
          navigate={input.state.navigate}
          navigateReplace={input.state.navigateReplace}
        />
      ),
      gate: "none",
      shell: "none",
    },
    allItems: {
      pageName: pageNameDemo.allItems,
      path: pageRouteDemo.allItems,
      component: () => <DemoAllItems navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    login: {
      pageName: pageNameDemo.login,
      path: pageRouteDemo.login,
      component: () => <DemoSelectedLogin navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    secureNote: {
      pageName: pageNameDemo.secureNote,
      path: pageRouteDemo.secureNote,
      component: () => <DemoSelectedSecureNote navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    creditCard: {
      pageName: pageNameDemo.creditCard,
      path: pageRouteDemo.creditCard,
      component: () => <DemoSelectedCreditCard navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    identity: {
      pageName: pageNameDemo.identity,
      path: pageRouteDemo.identity,
      component: () => <DemoSelectedIdentity navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    sshKey: {
      pageName: pageNameDemo.sshKey,
      path: pageRouteDemo.sshKey,
      component: () => <DemoSelectedSshKey navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    emptyState: {
      pageName: pageNameDemo.emptyState,
      path: pageRouteDemo.emptyState,
      component: () => <DemoEmptyState navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    trash: {
      pageName: pageNameDemo.trash,
      path: pageRouteDemo.trash,
      component: () => <DemoTrash navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
    locked: {
      pageName: pageNameDemo.locked,
      path: pageRouteDemo.locked,
      component: () => <DemoLocked navigate={input.state.navigate} />,
      gate: "none",
      shell: "none",
    },
  } as const satisfies Record<PageRouteDemo, DemoRoute>

  return Object.values(routeMapping)
}
