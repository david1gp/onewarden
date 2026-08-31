import { render } from "@solidjs/testing-library"
import { describe, expect, test } from "bun:test"
import { within } from "@testing-library/dom"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { CipherDeleteDialog } from "../../../src/web/ciphers/ui/CipherDeleteDialog.jsx"
import { CipherShareDialog } from "../../../src/web/ciphers/ui/CipherShareDialog.jsx"
import type { VaultCollection } from "../../../src/web/vault/model/vaultCollectionSchema.js"

describe("CipherShareDialog and CipherDeleteDialog", () => {
  test("selects CheckMultiple collections by name and submits their IDs", async () => {
    let sharedOrg: string | null = null
    let sharedCols: string[] = []

    const openSignal = createSignalObject(true)
    const item: CipherItem = {
      id: "cipher-share-item",
      type: 1,
      name: "Shared Credentials",
      favorite: false,
      fields: [],
      reprompt: 0,
    }
    const collections: VaultCollection[] = [
      { id: "col-engineering", organizationId: "org-abc-123", name: "Engineering" },
      { id: "col-finance", organizationId: "org-abc-123", name: "Finance" },
    ]

    const screen = render(() => (
      <CipherShareDialog
        openSignal={openSignal}
        item={() => item}
        collections={() => collections}
        onShare={(orgId, colIds) => {
          sharedOrg = orgId
          sharedCols = colIds
        }}
      />
    ))
    const body = within(document.body)

    expect(body.getByText("Share to Organization")).toBeDefined()

    const orgInput = body.getByLabelText(/Organization ID/) as HTMLInputElement
    orgInput.value = "org-abc-123"
    orgInput.dispatchEvent(new Event("input", { bubbles: true }))

    const engineering = body.getByRole("button", { name: "Engineering" })
    const finance = body.getByRole("button", { name: "Finance" })
    expect(engineering.getAttribute("aria-pressed")).toBe("false")
    engineering.click()
    finance.click()
    expect(engineering.getAttribute("aria-pressed")).toBe("true")

    const submitBtn = body.getByText("Share Item")
    submitBtn.click()
    await Promise.resolve()

    expect(sharedOrg).toBe("org-abc-123" as any)
    expect(sharedCols).toEqual(["col-engineering", "col-finance"])

    screen.unmount()
  })

  test("requires at least one collection before sharing", async () => {
    let shareCalls = 0
    const openSignal = createSignalObject(true)
    const item: CipherItem = {
      id: "cipher-share-validation",
      type: 1,
      name: "Validated Share",
      favorite: false,
      fields: [],
      reprompt: 0,
    }
    const collections: VaultCollection[] = [
      { id: "col-engineering", organizationId: "org-abc-123", name: "Engineering" },
    ]
    const screen = render(() => (
      <CipherShareDialog
        openSignal={openSignal}
        item={() => item}
        collections={() => collections}
        onShare={() => {
          shareCalls += 1
        }}
      />
    ))
    const body = within(document.body)
    const orgInput = body.getByLabelText(/Organization ID/) as HTMLInputElement
    orgInput.value = "org-abc-123"
    orgInput.dispatchEvent(new Event("input", { bubbles: true }))

    body.getByRole("button", { name: "Share Item" }).click()
    await Promise.resolve()

    expect(body.getByText("At least one Collection ID is required.")).toBeDefined()
    expect(shareCalls).toBe(0)
    screen.unmount()
  })

  test("renders CipherDeleteDialog in soft delete mode and confirms", () => {
    let confirmCalled = false
    const openSignal = createSignalObject(true)
    const item: CipherItem = {
      id: "cipher-del-item",
      type: 1,
      name: "Old Login",
      favorite: false,
      fields: [],
      reprompt: 0,
    }

    const screen = render(() => (
      <CipherDeleteDialog
        openSignal={openSignal}
        item={() => item}
        hardDelete={false}
        onConfirm={() => {
          confirmCalled = true
        }}
      />
    ))
    const body = within(document.body)

    expect(body.getAllByText("Move to Trash").length).toBeGreaterThanOrEqual(1)
    const confirmBtn = body.getByRole("button", { name: "Move to Trash" })
    confirmBtn.click()
    expect(confirmCalled).toBe(true)

    screen.unmount()
  })

  test("renders CipherDeleteDialog in hard delete mode", () => {
    let confirmCalled = false
    const openSignal = createSignalObject(true)
    const item: CipherItem = {
      id: "cipher-hard-item",
      type: 1,
      name: "Permanent Trash Item",
      favorite: false,
      fields: [],
      reprompt: 0,
    }

    const screen = render(() => (
      <CipherDeleteDialog
        openSignal={openSignal}
        item={() => item}
        hardDelete={true}
        onConfirm={() => {
          confirmCalled = true
        }}
      />
    ))
    const body = within(document.body)

    expect(body.getAllByText("Delete Permanently").length).toBeGreaterThanOrEqual(1)
    const confirmBtn = body.getByRole("button", { name: "Delete Permanently" })
    confirmBtn.click()
    expect(confirmCalled).toBe(true)

    screen.unmount()
  })
})
