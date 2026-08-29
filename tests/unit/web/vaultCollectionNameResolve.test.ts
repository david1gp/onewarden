import { expect, test } from "bun:test"
import { vaultCollectionNameResolve } from "../../../src/web/demo/vaultCollectionNameResolve.js"

test("vault collection name resolve maps known collection ids and falls back to id", () => {
  expect(vaultCollectionNameResolve("collection-engineering")).toBe("Engineering")
  expect(vaultCollectionNameResolve("collection-infrastructure")).toBe("Infrastructure")
  expect(vaultCollectionNameResolve("collection-finance")).toBe("Finance")
  expect(vaultCollectionNameResolve("collection-family")).toBe("Family")
  expect(vaultCollectionNameResolve("collection-identity")).toBe("Identity")
  expect(vaultCollectionNameResolve("unknown-col")).toBe("unknown-col")
})
