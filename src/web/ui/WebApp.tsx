import type { JSX } from "solid-js"
import { WebAppShell } from "./WebAppShell.jsx"

export function WebApp(): JSX.Element {
  return (
    <WebAppShell>
      <h1 class="text-2xl font-semibold">OneWarden</h1>
      <p class="mt-2 max-w-prose text-slate-600">No application features are available in this build yet.</p>
    </WebAppShell>
  )
}
