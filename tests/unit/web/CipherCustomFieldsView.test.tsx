import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import type { CipherCustomField } from "../../../src/web/ciphers/schemas/cipherCustomFieldSchema.js"
import { CipherCustomFieldsView } from "../../../src/web/ciphers/ui/CipherCustomFieldsView.jsx"

const fields: readonly CipherCustomField[] = [
  { name: "Recovery Code", value: "secret", type: 1, linkedId: undefined },
  { name: "Environment", value: "production", type: 0, linkedId: undefined },
  { name: "Verified", value: "true", type: 2, linkedId: undefined },
]

test("CipherCustomFieldsView preserves field reveal, badges, copy feedback, and row spacing", () => {
  const fieldsSignal = createSignalObject<readonly CipherCustomField[]>(fields)
  const screen = render(() => <CipherCustomFieldsView fields={fieldsSignal.get} />)

  expect(screen.getByText("••••••••••••")).toBeDefined()
  expect(screen.queryByText("secret")).toBeNull()
  expect(screen.getByText("production")).toBeDefined()
  expect(screen.getByText("Enabled / Checked")).toBeDefined()
  expect(screen.getAllByRole("button", { name: "Copy field value" })).toHaveLength(2)
  expect(screen.queryByRole("button", { name: "Copy Verified" })).toBeNull()

  const revealButton = screen.getByRole("button", { name: "Show field value" })
  revealButton.click()
  expect(screen.getByText("secret")).toBeDefined()
  expect(screen.getByRole("button", { name: "Hide field value" })).toBeDefined()

  const copyButtons = screen.getAllByRole("button", { name: "Copy field value" })
  copyButtons[0]?.click()
  expect(screen.getByRole("button", { name: "Copied" })).toBeDefined()
  expect(screen.getAllByRole("button", { name: "Copy field value" })).toHaveLength(1)
  screen.getByRole("button", { name: "Copy field value" }).click()
  expect(screen.getByRole("button", { name: "Copied" })).toBeDefined()
  expect(screen.getAllByRole("button", { name: "Copy field value" })).toHaveLength(1)

  const rows = screen.container.querySelectorAll("[class*='border-b']")
  expect(rows).toHaveLength(3)
  expect(rows[0]?.classList.contains("last:pb-0")).toBe(true)
  expect(rows[2]?.classList.contains("last:pb-0")).toBe(true)

  screen.unmount()
})
