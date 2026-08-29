import { expect, test } from "bun:test"
import { demoTrashStateCreate } from "../../../src/web/demo/demoTrashStateCreate.js"
import { vaultTrashDemoData } from "../../../src/web/demo/vaultTrashDemoData.js"

test("trash fixtures retain soft-delete metadata", () => {
  expect(
    vaultTrashDemoData.every((item) => {
      const deletedAt = Reflect.get(item, "deletedAt")
      return typeof deletedAt === "string"
    }),
  ).toBe(true)
})

test("trash state restores items and permanently removes them", () => {
  const state = demoTrashStateCreate() as unknown as {
    items: Array<{ id: string; deletedAt: string | null }>
    restoreItem: (id: string) => void
    permanentlyDeleteItem: (id: string) => void
  }

  expect(typeof state.restoreItem).toBe("function")
  expect(typeof state.permanentlyDeleteItem).toBe("function")
  if (typeof state.restoreItem !== "function" || typeof state.permanentlyDeleteItem !== "function") return

  state.restoreItem("item-trash-legacy-db")
  expect(state.items.some((item) => item.id === "item-trash-legacy-db")).toBe(false)

  state.permanentlyDeleteItem("item-trash-vpn-cert")
  expect(state.items.some((item) => item.id === "item-trash-vpn-cert")).toBe(false)
})
