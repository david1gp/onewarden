import { type JSX, Match, Switch } from "solid-js"
import { AdminDemoDashboardView } from "../admin/AdminDemoDashboardView.jsx"
import { AdminDemoLoginView } from "../admin/AdminDemoLoginView.jsx"
import { demoAdminStateCreate } from "./demoAdminStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"

type DemoAdminProps = Readonly<{
  readonly pathname?: () => string
  readonly search?: () => string
  readonly hash?: () => string
  readonly navigate?: (path: string) => void
  readonly navigateReplace?: (path: string) => void
}>

export function DemoAdmin(props: DemoAdminProps = {}): JSX.Element {
  const state = demoAdminStateCreate(props)

  return (
    <div class="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <VaultDemoHeader currentDemo={pageNameDemo.admin} showTitle={false} navigate={props.navigate} />
      <Switch>
        <Match when={state.loginVisible()}>
          <AdminDemoLoginView onLogin={state.loginComplete} />
        </Match>
        <Match when={!state.loginVisible()}>
          <AdminDemoDashboardView state={state.adminState} onShowLogin={state.loginShow} />
        </Match>
      </Switch>
    </div>
  )
}
