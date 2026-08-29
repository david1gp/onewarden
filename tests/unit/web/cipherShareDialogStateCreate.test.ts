import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { cipherShareDialogStateCreate } from "../../../src/web/ciphers/ui/cipherShareDialogStateCreate.js"

const shareableItem: CipherItem = {
  id: "shareable-item",
  type: 1,
  name: "Shareable Login",
  favorite: false,
  fields: [],
  organizationId: null,
}

test("cipherShareDialogStateCreate requires a collection when sharing", async () => {
  const item = createSignalObject<CipherItem | null>(shareableItem)
  let dispose: (() => void) | undefined
  let shareCalls = 0
  let state: ReturnType<typeof cipherShareDialogStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherShareDialogStateCreate({
      item: item.get,
      onShare: async () => {
        shareCalls += 1
      },
    })
  })

  if (!state) return

  state.organizationId.set("org-acme")
  state.collectionIdsText.set(" , ")
  await state.handleShare()

  expect(shareCalls).toBe(0)
  expect(state.errorMessage()).toBe("At least one Collection ID is required.")
  expect(state.isSharing()).toBe(false)
  dispose?.()
})
