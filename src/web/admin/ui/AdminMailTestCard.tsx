import { type JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AdminMailTestCardProps, adminMailTestCardStateCreate } from "./adminMailTestCardStateCreate.js"

export function AdminMailTestCard(props: AdminMailTestCardProps): JSX.Element {
  const state = adminMailTestCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
          <Icon path={vaultSvgIcons.email} class="size-5" />
        </div>
        <div>
          <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">SMTP Mail Test</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Test outbound email delivery configuration</p>
        </div>
      </div>

      <form onSubmit={state.handleSendTestMail} class="mt-4 flex max-w-md items-center gap-2">
        <Input
          type="email"
          placeholder="your-email@example.com"
          value={state.emailInput()}
          onInput={(e) => state.setEmailInput(e.currentTarget.value)}
          required
          class="h-8 w-full text-xs"
        />
        <Button type="submit" variant="filled" size="sm" class="h-8 shrink-0 text-xs" disabled={state.isSending()}>
          {state.isSending() ? "Sending..." : "Send Test Mail"}
        </Button>
      </form>
    </CardWrapper>
  )
}
