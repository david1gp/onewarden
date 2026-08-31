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
  state.collectionIds.set([])
  await state.handleShare()

  expect(shareCalls).toBe(0)
  expect(state.errorMessage()).toBe("At least one Collection ID is required.")
  expect(state.isSharing()).toBe(false)
  dispose?.()
})

test("cipherShareDialogStateCreate submits collection IDs and resets them when the item changes", async () => {
  const item = createSignalObject<CipherItem | null>({ ...shareableItem, collectionIds: ["col-engineering"] })
  const submissions: string[][] = []
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherShareDialogStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherShareDialogStateCreate({
      item: item.get,
      collections: () => [
        { id: "col-engineering", organizationId: "org-acme", name: "Engineering" },
        { id: "col-finance", organizationId: "org-acme", name: "Finance" },
      ],
      onShare: async (_organizationId, collectionIds) => {
        submissions.push(collectionIds)
      },
    })
  })

  if (!state) return

  expect(state.collectionOptions()).toEqual(["col-engineering", "col-finance"])
  expect(state.collectionName("col-engineering")).toBe("Engineering")
  state.organizationId.set("org-acme")
  state.collectionIds.set(["col-finance"])
  await state.handleShare()
  expect(submissions).toEqual([["col-finance"]])

  item.set({ ...shareableItem, id: "second-item", collectionIds: ["col-engineering"] })
  expect(state.collectionIds.get()).toEqual(["col-engineering"])
  dispose?.()
})
