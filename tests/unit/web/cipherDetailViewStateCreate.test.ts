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

function deferredCreate() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

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

test("cipher detail surfaces favorite callback failures", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("favorite-item"))
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({
      item: selectedItem.get,
      onToggleFavorite: async () => {
        throw new Error("Favorite update failed")
      },
    })
  })

  if (!state) return

  await state.toggleFavorite()

  expect(state.actionErrorMessage()).toBe("Favorite update failed")
  expect(state.isActionLoading()).toBe(false)
  dispose?.()
})

test("cipher detail settles clone loading when the callback selects another item", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("clone-source"))
  const deferred = deferredCreate()
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({
      item: selectedItem.get,
      onClone: () => {
        selectedItem.set(loginItemCreate("clone-result"))
        return deferred.promise
      },
    })
  })

  if (!state) return
  const action = state.handleClone()
  await Promise.resolve()

  expect(state.itemId()).toBe("clone-result")
  expect(state.isActionLoading()).toBe(false)

  deferred.resolve()
  await action
  dispose?.()
})

test("cipher detail closes delete confirmation when soft delete selects another item", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("trash-source"))
  const deferred = deferredCreate()
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({
      item: selectedItem.get,
      onDelete: () => {
        selectedItem.set(loginItemCreate("trash-next"))
        return deferred.promise
      },
    })
  })

  if (!state) return
  state.openDeleteDialog(false)
  const action = state.handleConfirmDelete()
  await Promise.resolve()

  expect(state.itemId()).toBe("trash-next")
  expect(state.isActionLoading()).toBe(false)
  expect(state.isDeleteDialogOpen.get()).toBe(false)

  deferred.resolve()
  await action
  dispose?.()
})

test("cipher detail settles restore loading when the callback selects another item", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("restore-source"))
  const deferred = deferredCreate()
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({
      item: selectedItem.get,
      onRestore: () => {
        selectedItem.set(loginItemCreate("restore-result"))
        return deferred.promise
      },
    })
  })

  if (!state) return
  const action = state.handleRestore()
  await Promise.resolve()

  expect(state.itemId()).toBe("restore-result")
  expect(state.isActionLoading()).toBe(false)

  deferred.resolve()
  await action
  dispose?.()
})

test("cipher detail closes permanent-delete confirmation when the item is removed", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("hard-source"))
  const deferred = deferredCreate()
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({
      item: selectedItem.get,
      onDelete: () => {
        selectedItem.set(null)
        return deferred.promise
      },
    })
  })

  if (!state) return
  state.openDeleteDialog(true)
  const action = state.handleConfirmDelete()
  await Promise.resolve()

  expect(state.item()).toBeNull()
  expect(state.isActionLoading()).toBe(false)
  expect(state.isDeleteDialogOpen.get()).toBe(false)

  deferred.resolve()
  await action
  dispose?.()
})

test("cipher detail clears in-flight loading and confirmation when its state is disposed", async () => {
  const selectedItem = createSignalObject<CipherItem | null>(loginItemCreate("disposed-source"))
  const deferred = deferredCreate()
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof cipherDetailViewStateCreate> | undefined

  createRoot((rootDispose) => {
    dispose = rootDispose
    state = cipherDetailViewStateCreate({
      item: selectedItem.get,
      onDelete: () => deferred.promise,
    })
  })

  if (!state) return
  state.openDeleteDialog(false)
  const action = state.handleConfirmDelete()
  expect(state.isActionLoading()).toBe(true)

  dispose?.()
  expect(state.isActionLoading()).toBe(false)
  expect(state.isDeleteDialogOpen.get()).toBe(false)

  deferred.resolve()
  await action
})
