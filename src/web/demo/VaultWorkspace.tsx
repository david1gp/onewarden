import type { JSX } from "solid-js"
import { VaultWorkspace as VaultWorkspaceView } from "../vault/ui/VaultWorkspace.jsx"
import { type VaultWorkspaceProps, vaultWorkspaceStateCreate } from "./vaultWorkspaceStateCreate.js"

export function VaultWorkspace(props: VaultWorkspaceProps = {}): JSX.Element {
  const state = vaultWorkspaceStateCreate(props)

  return (
    <VaultWorkspaceView state={state} actions={state} profile={props.profile} copyToClipboard={state.copyToClipboard} />
  )
}
