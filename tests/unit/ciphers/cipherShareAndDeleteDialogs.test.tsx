import { render } from "@solidjs/testing-library"
import { describe, expect, test } from "bun:test"
import { within } from "@testing-library/dom"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { CipherDeleteDialog } from "../../../src/web/ciphers/ui/CipherDeleteDialog.jsx"
import { CipherShareDialog } from "../../../src/web/ciphers/ui/CipherShareDialog.jsx"

describe("CipherShareDialog and CipherDeleteDialog", () => {
  test("renders CipherShareDialog and submits organization sharing", () => {
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

    const screen = render(() => (
      <CipherShareDialog
        openSignal={openSignal}
        item={() => item}
        onShare={(orgId, colIds) => {
          sharedOrg = orgId
          sharedCols = colIds
        }}
      />
    ))
    const body = within(document.body)

    expect(body.getByText("Share to Organization")).toBeDefined()

    const orgInput = body.getByLabelText(/Organization ID/) as HTMLInputElement
    const colsInput = body.getByLabelText(/Collection IDs/) as HTMLInputElement

    orgInput.value = "org-abc-123"
    orgInput.dispatchEvent(new Event("input", { bubbles: true }))

    colsInput.value = "col-engineering, col-finance"
    colsInput.dispatchEvent(new Event("input", { bubbles: true }))

    const submitBtn = body.getByText("Share Item")
    submitBtn.click()

    expect(sharedOrg).toBe("org-abc-123" as any)
    expect(sharedCols).toEqual(["col-engineering", "col-finance"])

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
