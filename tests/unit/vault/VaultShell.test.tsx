import { render, within } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { VaultShell } from "../../../src/web/vault/ui/VaultShell.jsx"

test("VaultShell renders semantic landmarks and search input", () => {
  const screen = render(() => (
    <VaultShell
      initialItems={[
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
      ]}
    />
  ))

  expect(screen.getByRole("banner")).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.getByRole("contentinfo")).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("OneWarden")
  expect(screen.getByPlaceholderText(/Search items/i)).toBeDefined()
  expect(screen.getAllByText("My Login").length).toBeGreaterThan(0)
  const itemList = screen.getByRole("list", { name: "Vault Credentials" })
  expect(within(itemList).getByRole("button", { name: /My Login/ })).toBeDefined()

  screen.unmount()
})
