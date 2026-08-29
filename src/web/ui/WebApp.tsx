import { type JSX, Match, Switch } from "solid-js"
import { DemoAllItems } from "../demo/DemoAllItems.jsx"
import { DemoDirectory } from "../demo/DemoDirectory.jsx"
import { DemoEmptyState } from "../demo/DemoEmptyState.jsx"
import { DemoLocked } from "../demo/DemoLocked.jsx"
import { DemoSelectedCreditCard } from "../demo/DemoSelectedCreditCard.jsx"
import { DemoSelectedIdentity } from "../demo/DemoSelectedIdentity.jsx"
import { DemoSelectedLogin } from "../demo/DemoSelectedLogin.jsx"
import { DemoSelectedSecureNote } from "../demo/DemoSelectedSecureNote.jsx"
import { DemoTrash } from "../demo/DemoTrash.jsx"
import { WebAppShell } from "./WebAppShell.jsx"
import { webAppStateCreate } from "./webAppStateCreate.js"

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
      <Match when={state.currentRoute() === "root"}>
        <WebAppShell>
          <h1 class="text-2xl font-semibold">OneWarden</h1>
          <p class="mt-2 max-w-prose text-slate-600">Secure vault and password manager.</p>
        </WebAppShell>
      </Match>
    </Switch>
  )
}
