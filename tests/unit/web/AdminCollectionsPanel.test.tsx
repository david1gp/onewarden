import { expect, test } from "bun:test"
import { fireEvent, render, within } from "@solidjs/testing-library"
import { AdminCollectionsPanel } from "../../../src/web/admin/AdminCollectionsPanel.jsx"
import type { AdminShellState } from "../../../src/web/admin/AdminShellState.js"
import { adminDemoStateCreate } from "../../../src/web/demo/adminDemoStateCreate.js"

function adminCollectionsPanelRender() {
  const state = adminDemoStateCreate() as unknown as AdminShellState
  const screen = render(() => <AdminCollectionsPanel state={state} />)
  return { screen, state }
}

test("AdminCollectionsPanel renders the reused organization collection list and detail", () => {
  const { screen } = adminCollectionsPanelRender()

  try {
    expect(screen.getByRole("heading", { level: 3, name: "Collections" })).toBeDefined()
    expect(screen.getByRole("group", { name: "Collection organization" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Acme Design Studio" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Acme Core Infrastructure" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByText("Collections (9)")).toBeDefined()
    expect(screen.getByRole("button", { name: "New Collection" })).toBeDefined()
    expect(screen.getByRole("heading", { level: 2, name: "Engineering Infrastructure" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Edit Collection" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Delete Collection" })).toBeDefined()
  } finally {
    screen.unmount()
  }
})

test("AdminCollectionsPanel switches organizations and selects collections", () => {
  const { screen, state } = adminCollectionsPanelRender()

  try {
    fireEvent.click(screen.getByRole("button", { name: "Acme Design Studio" }))

    expect(state.collectionState.selectedOrganization()?.id).toBe("organization-acme-design")
    expect(screen.getByText("Collections (4)")).toBeDefined()

    fireEvent.click(screen.getByText("Brand Studio"))

    expect(state.collectionState.selectedCollectionId()).toBe("collection-acme-design-002")
    expect(screen.getByRole("heading", { level: 2, name: "Brand Studio" })).toBeDefined()
  } finally {
    screen.unmount()
  }
})

test("AdminCollectionsPanel searches collections in the selected organization", () => {
  const { screen } = adminCollectionsPanelRender()

  try {
    fireEvent.input(screen.getByPlaceholderText("Search collections..."), { target: { value: "COL-CORE-FIN" } })

    expect(screen.getByText("Collections (1)")).toBeDefined()
    expect(screen.getByText("Finance & Banking")).toBeDefined()
    expect(screen.queryByText("Marketing & Social")).toBeNull()
  } finally {
    screen.unmount()
  }
})

test("AdminCollectionsPanel renders the empty collection state with AA contrast text", () => {
  const { screen } = adminCollectionsPanelRender()

  try {
    fireEvent.input(screen.getByPlaceholderText("Search collections..."), { target: { value: "no-such-collection" } })

    const empty = screen.getByText("No collections found.")
    const container = empty.parentElement as HTMLElement

    expect(screen.getByText("Collections (0)")).toBeDefined()
    expect(container.className).toContain("text-slate-500")
    expect(container.className).not.toContain(" text-slate-400")
  } finally {
    screen.unmount()
  }
})

test("AdminCollectionsPanel deletes a collection, syncs counts, and reports feedback", async () => {
  const { screen, state } = adminCollectionsPanelRender()

  try {
    fireEvent.click(screen.getByRole("button", { name: "Delete Collection" }))
    await Promise.resolve()

    expect(state.collectionState.collectionCount("organization-acme-core")).toBe(8)
    expect(
      state.collectionState.organizations().find((org) => org.id === "organization-acme-core")?.collectionCount,
    ).toBe(8)
    expect(state.feedback()).toEqual({
      kind: "success",
      message: "Collection Engineering Infrastructure deleted in demo state.",
    })
  } finally {
    screen.unmount()
  }
})

test("AdminCollectionsPanel opens the create dialog with organization members", async () => {
  const { screen } = adminCollectionsPanelRender()

  try {
    fireEvent.click(screen.getByRole("button", { name: "New Collection" }))
    const dialog = within(await within(document.body).findByRole("dialog"))

    expect(dialog.getByLabelText("Collection Name")).toBeDefined()
    expect(dialog.getByLabelText("External ID (Optional)")).toBeDefined()
    expect(dialog.getByText("Alex Rivera")).toBeDefined()
    expect(dialog.getByText("Morgan Lee")).toBeDefined()
  } finally {
    screen.unmount()
  }
})

test("AdminCollectionsPanel opens the edit dialog prefilled from the selected collection", async () => {
  const { screen } = adminCollectionsPanelRender()

  try {
    fireEvent.click(screen.getByRole("button", { name: "Edit Collection" }))
    const dialog = within(await within(document.body).findByRole("dialog"))

    expect((dialog.getByLabelText("Collection Name") as HTMLInputElement).value).toBe("Engineering Infrastructure")
    expect((dialog.getByLabelText("External ID") as HTMLInputElement).value).toBe("COL-CORE-ENG")
  } finally {
    screen.unmount()
  }
})
