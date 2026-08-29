import type { JSX } from "solid-js"
import { AdminShell } from "../admin/AdminShell.jsx"
import { adminDemoStateCreate } from "./adminDemoStateCreate.js"
import { VaultDemoHeader } from "./VaultDemoHeader.jsx"

export function DemoAdmin(): JSX.Element {
  const state = adminDemoStateCreate()

  return (
    <div class="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <VaultDemoHeader currentDemo="admin" showTitle={false} />
      <AdminShell state={state} />
    </div>
  )
}
