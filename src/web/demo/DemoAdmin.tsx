import { type JSX, Match, Switch } from "solid-js"
import { AdminDemoDashboardView } from "../admin/AdminDemoDashboardView.jsx"
import { AdminDemoLoginView } from "../admin/AdminDemoLoginView.jsx"
import { demoAdminStateCreate } from "./demoAdminStateCreate.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"

export function DemoAdmin(): JSX.Element {
  const state = demoAdminStateCreate()

  return (
    <div class="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <VaultDemoHeader currentDemo="admin" showTitle={false} />
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
