import { describe, expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
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
})
