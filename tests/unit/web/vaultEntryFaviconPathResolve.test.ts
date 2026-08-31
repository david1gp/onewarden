import { expect, test } from "bun:test"
import { vaultEntryFaviconPathResolve } from "../../../src/web/demo/vaultEntryFaviconPathResolve.js"

test("vaultEntryFaviconPathResolve resolves normalized HTTP(S) hostnames", () => {
  expect(vaultEntryFaviconPathResolve("https://Example.COM/login")).toBe("/icons/example.com/icon.png?fallback=error")
  expect(vaultEntryFaviconPathResolve("http://sub.example.com:8443/path")).toBe(
    "/icons/sub.example.com/icon.png?fallback=error",
  )
  expect(vaultEntryFaviconPathResolve("https://Sub.Example.COM.:8443/path")).toBe(
    "/icons/sub.example.com/icon.png?fallback=error",
  )
})

test("vaultEntryFaviconPathResolve rejects missing and malformed URLs", () => {
  expect(vaultEntryFaviconPathResolve(undefined)).toBeNull()
  expect(vaultEntryFaviconPathResolve("")).toBeNull()
  expect(vaultEntryFaviconPathResolve("not a URL")).toBeNull()
  expect(vaultEntryFaviconPathResolve("https://")).toBeNull()
})

test("vaultEntryFaviconPathResolve rejects unsupported schemes", () => {
  expect(vaultEntryFaviconPathResolve("ssh://example.com")).toBeNull()
  expect(vaultEntryFaviconPathResolve("ftp://example.com")).toBeNull()
})
