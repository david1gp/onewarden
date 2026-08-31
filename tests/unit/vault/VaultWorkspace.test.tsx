import { expect, test } from "bun:test"
import { fireEvent, render, within } from "@solidjs/testing-library"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { VaultWorkspace } from "../../../src/web/demo/VaultWorkspace.jsx"
import { vaultAvailableCollectionsResolve } from "../../../src/web/demo/vaultAvailableCollectionsResolve.js"
import { vaultDemoData } from "../../../src/web/demo/vaultDemoData.js"

test("VaultWorkspace keeps mobile section buttons inside the labelled navigation", () => {
  const screen = render(() => <VaultWorkspace />)
  const sections = screen.getByRole("navigation", { name: "Vault sections" })

  expect(within(sections).getByRole("button", { name: /^Vaults$/ })).toBeDefined()
  expect(within(sections).getByRole("button", { name: /^Items/ })).toBeDefined()
  expect(within(sections).getByRole("button", { name: /^Details$/ })).toBeDefined()

  screen.unmount()
})

test("VaultWorkspace gives each shrink-safe column one independent styled scroll owner", () => {
  const screen = render(() => <VaultWorkspace />)
  const expectedColumns = ["vault-navigation-column", "vault-items-column", "vault-detail-column"]
  const scrollbarClasses = classesScrollbar.split(" ")

  for (const id of expectedColumns) {
    const column = screen.container.querySelector(`#${id}`)
    expect(column).not.toBeNull()
    expect(column?.classList.contains("min-w-0")).toBe(true)
    expect(column?.classList.contains("min-h-0")).toBe(true)

    const scrollOwners = Array.from(column?.querySelectorAll(".overflow-y-auto") ?? [])
    expect(scrollOwners).toHaveLength(1)
    expect(scrollOwners[0]?.classList.contains("min-h-0")).toBe(true)
    expect(scrollbarClasses.every((className) => scrollOwners[0]?.classList.contains(className))).toBe(true)
  }

  expect(screen.container.querySelector("#vault-navigation-column")?.classList.contains("shrink-0")).toBe(true)
  expect(screen.container.querySelector("#vault-items-column")?.classList.contains("shrink-0")).toBe(true)
  expect(screen.container.querySelector("#vault-detail-column")?.classList.contains("flex-1")).toBe(true)

  screen.unmount()
})

test("VaultWorkspace navigation groups use consistent spacing without separators", () => {
  const screen = render(() => <VaultWorkspace />)
  const navigation = screen.getByRole("navigation", { name: "Vault Navigation" })
  const scrollOwner = navigation.querySelector(".overflow-y-auto")

  expect(scrollOwner?.classList.contains("space-y-5")).toBe(true)
  expect(navigation.querySelector("hr, [role='separator']")).toBeNull()
  for (const group of Array.from(scrollOwner?.children ?? [])) {
    expect(group.classList.contains("border-t")).toBe(false)
    expect(group.classList.contains("border-b")).toBe(false)
  }

  screen.unmount()
})

test("VaultWorkspace focuses the live search when slash is pressed from the document", () => {
  const screen = render(() => <VaultWorkspace />)
  const search = screen.getByRole("searchbox")

  fireEvent.keyDown(document.body, { key: "/" })

  expect(document.activeElement).toBe(search)

  screen.unmount()
})

test("VaultWorkspace passes demo collection names and selected IDs to Manage Collections", async () => {
  const screen = render(() => (
    <VaultWorkspace
      items={() => vaultDemoData}
      collections={vaultAvailableCollectionsResolve}
      defaultSelectedId="item-github-enterprise"
    />
  ))

  fireEvent.click(screen.getByTitle("Manage Collections"))
  const dialog = await within(document.body).findByRole("dialog", { name: "Manage Collections" })
  const engineering = within(dialog).getByRole("button", { name: "Engineering" })

  expect(engineering.getAttribute("aria-pressed")).toBe("true")
  expect(within(dialog).getByRole("button", { name: "Infrastructure" })).toBeDefined()
  expect(within(dialog).getByRole("button", { name: "Finance" })).toBeDefined()

  screen.unmount()
})
