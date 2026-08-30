import { expect, test } from "bun:test"
import { vaultNavFolderIsWide } from "../../../src/web/demo/vaultNavFolderIsWide.js"

test("short folder labels stay inside a single sidebar column", () => {
  expect(vaultNavFolderIsWide("Work")).toBe(false)
  expect(vaultNavFolderIsWide("Social")).toBe(false)
  expect(vaultNavFolderIsWide("Engineering")).toBe(false)
})

test("long folder labels span both sidebar columns", () => {
  expect(vaultNavFolderIsWide("Infrastructure")).toBe(true)
  expect(vaultNavFolderIsWide("Finance & Accounting")).toBe(true)
})

test("surrounding whitespace does not widen a folder label", () => {
  expect(vaultNavFolderIsWide("   Work      ")).toBe(false)
})
