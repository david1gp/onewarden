import { fireEvent, render, within } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { VaultWorkspace } from "../../../src/web/demo/VaultWorkspace.jsx"

test("VaultWorkspace keeps mobile section buttons inside the labelled navigation", () => {
  const screen = render(() => <VaultWorkspace />)
  const sections = screen.getByRole("navigation", { name: "Vault sections" })

  expect(within(sections).getByRole("button", { name: /^Vaults$/ })).toBeDefined()
  expect(within(sections).getByRole("button", { name: /^Items/ })).toBeDefined()
  expect(within(sections).getByRole("button", { name: /^Details$/ })).toBeDefined()

  screen.unmount()
})

test("VaultWorkspace focuses the live search when slash is pressed from the document", () => {
  const screen = render(() => <VaultWorkspace />)
  const search = screen.getByRole("searchbox")

  fireEvent.keyDown(document.body, { key: "/" })

  expect(document.activeElement).toBe(search)

  screen.unmount()
})
