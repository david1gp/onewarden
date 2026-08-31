import { expect, test } from "bun:test"
import { fireEvent, render, within } from "@solidjs/testing-library"
import { VaultWorkspace } from "../../../src/web/demo/VaultWorkspace.jsx"

test("VaultWorkspace keeps mobile section buttons inside the labelled navigation", () => {
  const screen = render(() => <VaultWorkspace />)
  const sections = screen.getByRole("navigation", { name: "Vault sections" })

  expect(within(sections).getByRole("button", { name: /^Vaults$/ })).toBeDefined()
  expect(within(sections).getByRole("button", { name: /^Items/ })).toBeDefined()
  expect(within(sections).getByRole("button", { name: /^Details$/ })).toBeDefined()

  screen.unmount()
})

test("VaultWorkspace exposes stable, shrink-safe three-column regions", () => {
  const screen = render(() => <VaultWorkspace />)
  const expectedColumns = ["vault-navigation-column", "vault-items-column", "vault-detail-column"]

  for (const id of expectedColumns) {
    const column = screen.container.querySelector(`#${id}`)
    expect(column).not.toBeNull()
    expect(column?.classList.contains("min-w-0")).toBe(true)
  }

  expect(screen.container.querySelector("#vault-navigation-column")?.classList.contains("shrink-0")).toBe(true)
  expect(screen.container.querySelector("#vault-items-column")?.classList.contains("shrink-0")).toBe(true)
  expect(screen.container.querySelector("#vault-detail-column")?.classList.contains("flex-1")).toBe(true)

  screen.unmount()
})

test("VaultWorkspace focuses the live search when slash is pressed from the document", () => {
  const screen = render(() => <VaultWorkspace />)
  const search = screen.getByRole("searchbox")

  fireEvent.keyDown(document.body, { key: "/" })

  expect(document.activeElement).toBe(search)

  screen.unmount()
})
