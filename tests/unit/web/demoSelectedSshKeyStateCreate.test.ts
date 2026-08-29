import { expect, test } from "bun:test"
import { demoSelectedSshKeyStateCreate } from "../../../src/web/demo/demoSelectedSshKeyStateCreate.js"

test("demo selected ssh key state initializes with sshKey category and deploy key selection", () => {
  const state = demoSelectedSshKeyStateCreate()

  expect(state.defaultCategory).toBe("sshKey")
  expect(state.defaultSelectedId).toBe("item-deploy-sshkey")
  expect(state.items.some((item) => item.id === "item-deploy-sshkey")).toBe(true)
})
