import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"

type WebAppNavHeaderActionsProps = Readonly<{
  readonly email: () => string | undefined
  readonly onNavigateToVault: () => void
  readonly onNavigateToSends: () => void
  readonly onNavigateToEmergencyAccess: () => void
  readonly onNavigateToSettings: () => void
  readonly onNavigateToTwoFactor: () => void
  readonly onLockVault: () => void
  readonly onLogout: () => void
}>

export function WebAppNavHeaderActions(props: WebAppNavHeaderActionsProps) {
  return (
    <div class="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-2.5">
      <span class="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300 sm:max-w-56 sm:flex-none">
        {props.email()}
      </span>
      <Button variant="outline" size="sm" class="h-8 shrink-0 text-sm" onClick={props.onNavigateToVault}>
        <Icon path={vaultSvgIcons.personalVault} class="mr-1 size-3.5" />
        Vault
      </Button>
      <Button variant="outline" size="sm" class="h-8 shrink-0 text-sm" onClick={props.onNavigateToSends}>
        <Icon path={vaultSvgIcons.send} class="mr-1 size-3.5" />
        Send
      </Button>
      <Button variant="outline" size="sm" class="h-8 shrink-0 text-sm" onClick={props.onNavigateToEmergencyAccess}>
        <Icon path={vaultSvgIcons.lifebuoy} class="mr-1 size-3.5" />
        Emergency
      </Button>
      <Button variant="outline" size="sm" class="h-8 shrink-0 text-sm" onClick={props.onNavigateToSettings}>
        <Icon path={vaultSvgIcons.server} class="mr-1 size-3.5" />
        Settings
      </Button>
      <Button variant="outline" size="sm" class="h-8 shrink-0 text-sm" onClick={props.onNavigateToTwoFactor}>
        <Icon path={vaultSvgIcons.twoFactor} class="mr-1 size-3.5" />
        2FA
      </Button>
      <Button variant="outline" size="sm" class="h-8 shrink-0 text-sm" onClick={props.onLockVault}>
        <Icon path={vaultSvgIcons.lock} class="mr-1 size-3.5" />
        Lock
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-8 shrink-0 text-sm text-red-600 dark:text-red-400"
        onClick={props.onLogout}
      >
        <Icon path={vaultSvgIcons.login} class="mr-1 size-3.5" />
        Log Out
      </Button>
    </div>
  )
}
