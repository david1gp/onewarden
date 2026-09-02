import { render } from "@solidjs/testing-library"
import { describe, expect, test } from "bun:test"
import { within } from "@testing-library/dom"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { CipherDialog } from "../../../src/web/ciphers/ui/CipherDialog.jsx"

describe("CipherDialog component", () => {
  test("renders cipher dialog in view mode and allows switching to edit mode", async () => {
    const openSignal = createSignalObject(true)

    const item: CipherItem = {
      id: "cipher-dialog-item-1",
      type: 1,
      name: "AWS Root Console",
      favorite: true,
      fields: [],
      login: {
        username: "root@aws.com",
        password: "SuperAwsPassword123!",
        totp: "847129",
      },
      reprompt: 0,
    }

    const screen = render(() => <CipherDialog openSignal={openSignal} mode={() => "view"} initialItem={() => item} />)
    const body = within(document.body)

    expect(body.getAllByText("AWS Root Console").length).toBeGreaterThanOrEqual(1)
    expect(body.getByText("root@aws.com")).toBeDefined()

    // Switch to edit mode by clicking the action toolbar button.
    const editBtn = body.getByRole("button", { name: "Edit" })
    editBtn.click()

    expect(body.getAllByText(/Edit AWS Root Console/).length).toBeGreaterThanOrEqual(1)

    screen.unmount()
  })

  test("renders cipher dialog in create mode", () => {
    const openSignal = createSignalObject(true)

    const screen = render(() => <CipherDialog openSignal={openSignal} mode={() => "create"} />)
    const body = within(document.body)

    expect(body.getByText("Add New Cipher Item")).toBeDefined()
    expect(body.getAllByText("Save Item").length).toBeGreaterThanOrEqual(1)

    screen.unmount()
  })
})
