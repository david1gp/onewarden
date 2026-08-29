import { render } from "@solidjs/testing-library"
import { describe, expect, test } from "bun:test"
import { within } from "@testing-library/dom"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { CipherPasswordHistoryDialog } from "../../../src/web/ciphers/ui/CipherPasswordHistoryDialog.jsx"
import { CipherPasswordHistoryList } from "../../../src/web/ciphers/ui/CipherPasswordHistoryList.jsx"

describe("CipherPasswordHistory components", () => {
  test("renders CipherPasswordHistoryList with entries and copy / reveal controls", () => {
    const entries = [
      { password: "SecretPasswordAlpha", lastUsedDate: "2026-01-10T12:00:00.000Z" },
      { password: "SecretPasswordBeta", lastUsedDate: "2025-06-01T08:00:00.000Z" },
    ]

    const screen = render(() => <CipherPasswordHistoryList entries={() => entries} />)

    expect(screen.getAllByText("••••••••••••••••••••")).toHaveLength(2)

    // Toggle reveal for the first password
    const revealBtns = screen.getAllByLabelText("Show password")
    expect(revealBtns.length).toBe(2)
    revealBtns[0]?.click()
    expect(screen.getByText("SecretPasswordAlpha")).toBeDefined()

    // Test copy button
    const copyBtns = screen.getAllByLabelText("Copy past password")
    expect(copyBtns.length).toBe(2)
    copyBtns[0]?.click()

    screen.unmount()
  })

  test("renders CipherPasswordHistoryDialog when open", () => {
    const openSignal = createSignalObject(true)
    const item: CipherItem = {
      id: "cipher-hist-dialog",
      type: 1,
      name: "Database Admin",
      favorite: false,
      fields: [],
      passwordHistory: [{ password: "Pass123!", lastUsedDate: "2026-02-01T00:00:00.000Z" }],
      reprompt: 0,
    }

    const screen = render(() => <CipherPasswordHistoryDialog openSignal={openSignal} item={() => item} />)
    const body = within(document.body)

    expect(body.getByText("Password History")).toBeDefined()
    expect(body.getByText(/1 recorded/)).toBeDefined()
    screen.unmount()
  })
})
