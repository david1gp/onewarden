import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { cipherDetailViewStateCreate } from "../../../src/web/ciphers/ui/cipherDetailViewStateCreate.js"

const loginItemCreate = (id: string): CipherItem =>
  ({
    id,
    type: 1,
    name: id,
    favorite: false,
    fields: [],
    login: {
      username: "alex@example.com",
      password: "secret",
      totp: null,
      uris: null,
      passwordRevisionDate: null,
    },
  }) as CipherItem

test("cipher detail resets reveal and copy state when the selected item changes", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("first-item"))
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({ item: selectedItem.get })
  })

  await Promise.resolve()
  if (!state) return

  state.togglePasswordReveal()
  state.copyToClipboard("password", "secret")
  expect(state.isPasswordRevealed()).toBe(true)
  expect(state.copiedField()).toBe("password")

  selectedItem.set(loginItemCreate("second-item"))
  await Promise.resolve()

  expect(state.isPasswordRevealed()).toBe(false)
  expect(state.copiedField()).toBeNull()
  dispose?.()
})
