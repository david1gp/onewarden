import { expect, test } from "bun:test"
import { render, within } from "@solidjs/testing-library"
import { vaultWorkspaceStateCreate } from "../../../src/web/demo/vaultWorkspaceStateCreate.js"
import { VaultShell } from "../../../src/web/vault/ui/VaultShell.jsx"
import type { VaultShellViewProps } from "../../../src/web/vault/ui/vaultShellViewProps.js"

const state: VaultShellViewProps["state"] = {
  items: () => [
    {
      id: "item-1",
      title: "My Login",
      category: "login",
      vault: "Personal",
      favorite: true,
      username: "alice",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ],
  folders: () => [],
  collections: () => [],
  profile: () => undefined,
  isLoading: () => false,
  errorMessage: () => null,
}

const actions: VaultShellViewProps["actions"] = {
  syncVault: () => undefined,
}

const workspace = vaultWorkspaceStateCreate({
  collections: state.collections,
  folders: state.folders,
  items: state.items,
  profile: state.profile,
})

test("VaultShell renders semantic landmarks and search input", () => {
  const screen = render(() => (
    <VaultShell
      workspace={{ state: workspace, actions: workspace, profile: state.profile, copyToClipboard: workspace.copyToClipboard }}
      state={state}
      actions={actions}
    />
  ))

  expect(screen.getByRole("banner")).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.queryByRole("contentinfo")).toBeNull()
  expect(screen.queryByText("End-to-End Encrypted", { exact: true })).toBeNull()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("OneWarden")
  expect(screen.getByPlaceholderText(/Search items/i)).toBeDefined()
  expect(screen.getAllByText("My Login").length).toBeGreaterThan(0)
  const itemList = screen.getByRole("list", { name: "Vault Credentials" })
  expect(within(itemList).getByRole("button", { name: /My Login/ })).toBeDefined()

  screen.unmount()
})
