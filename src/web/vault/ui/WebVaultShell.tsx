import type { JSX } from "solid-js"
import { VaultShell } from "./VaultShell.jsx"
import { vaultShellStateCreate, type WebVaultShellProps } from "./vaultShellStateCreate.js"

export function WebVaultShell(props: WebVaultShellProps = {}): JSX.Element {
  const state = vaultShellStateCreate(props)

  return (
    <VaultShell
      workspace={state.workspace}
      state={state}
      actions={{
        syncVault: state.syncVault,
        onOpenOrganizations: props.onOpenOrganizations,
        onOpenSends: props.onOpenSends,
        onOpenEmergencyAccess: props.onOpenEmergencyAccess,
        onOpenSettings: props.onOpenSettings,
        onLock: props.onLock,
        onLogout: props.onLogout,
      }}
      enableUrlSync={props.enableUrlSync ?? true}
      pathname={props.pathname}
      search={props.search}
      hash={props.hash}
      navigateReplace={props.navigateReplace}
    />
  )
}
