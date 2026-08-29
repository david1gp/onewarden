import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherCustomField } from "../../../src/web/ciphers/schemas/cipherCustomFieldSchema.js"
import { cipherCustomFieldsViewStateCreate } from "../../../src/web/ciphers/ui/cipherCustomFieldsViewStateCreate.js"

test("cipher custom fields reset reveal and copy state when the selected item changes", async () => {
  const fields = createSignalObject<readonly CipherCustomField[]>([
    { name: "Recovery Code", value: "secret", type: 1, linkedId: undefined },
  ])
  const itemId = createSignalObject<string | null>("first-item")
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherCustomFieldsViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherCustomFieldsViewStateCreate({ fields: fields.get, itemId: itemId.get })
  })

  await Promise.resolve()
  if (!state) return

  state.toggleConcealedField(0)
  state.copyField(0, "secret")
  expect(state.isFieldRevealed(0)).toBe(true)
  expect(state.copiedFieldIndex()).toBe(0)

  itemId.set("second-item")
  await Promise.resolve()

  expect(state.isFieldRevealed(0)).toBe(false)
  expect(state.copiedFieldIndex()).toBeNull()
  dispose?.()
})
