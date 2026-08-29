import { expect, test } from "bun:test"
import { vaultFilterApply } from "../../../src/web/vault/model/vaultFilterApply.js"
import type { VaultItem } from "../../../src/web/vault/model/vaultItemSchema.js"

const testItems: readonly VaultItem[] = [
  {
    id: "item-1",
    title: "GitHub Enterprise",
    category: "login",
    vault: "Work",
    favorite: true,
    folder: "Development",
    folderId: "folder-dev",
    collectionIds: ["col-engineering"],
    username: "alex.rivera@acme.corp",
    url: "https://github.acme.corp",
    notes: "Requires SSH key for git operations",
    customFields: [{ label: "Organization ID", value: "ORG-9842" }],
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-03-01T10:30:00Z",
  },
  {
    id: "item-2",
    title: "Personal Email",
    category: "login",
    vault: "Personal",
    favorite: false,
    folder: "Personal",
    folderId: "folder-personal",
    collectionIds: [],
    username: "alex@gmail.com",
    url: "https://mail.google.com",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-02-20T11:00:00Z",
  },
  {
    id: "item-3",
    title: "Server Root Key",
    category: "sshKey",
    vault: "Work",
    favorite: true,
    folder: "Infrastructure",
    folderId: "folder-infra",
    collectionIds: ["col-ops"],
    notes: "Production bastion host key",
    createdAt: "2024-02-01T12:00:00Z",
    updatedAt: "2024-02-25T14:00:00Z",
  },
  {
    id: "item-4",
    title: "Deleted Item",
    category: "secureNote",
    vault: "Personal",
    favorite: false,
    notes: "Old scratchpad",
    deletedDate: "2024-03-01T00:00:00Z",
    createdAt: "2023-12-01T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  },
]

test("vaultFilterApply filters out deleted items in default view", () => {
  const result = vaultFilterApply(testItems, { vault: "all", category: "all" })
  expect(result.length).toBe(3)
  expect(result.some((i) => i.id === "item-4")).toBe(false)
})

test("vaultFilterApply returns only deleted items when category is trash", () => {
  const result = vaultFilterApply(testItems, { vault: "all", category: "trash" })
  expect(result.length).toBe(1)
  expect(result[0]?.id).toBe("item-4")
})

test("vaultFilterApply filters by vault scope", () => {
  const workResult = vaultFilterApply(testItems, { vault: "Work", category: "all" })
  expect(workResult.length).toBe(2)
  expect(workResult.every((i) => i.vault === "Work")).toBe(true)

  const personalResult = vaultFilterApply(testItems, { vault: "Personal", category: "all" })
  expect(personalResult.length).toBe(1)
  expect(personalResult[0]?.id).toBe("item-2")
})

test("vaultFilterApply filters by favorites", () => {
  const favorites = vaultFilterApply(testItems, { vault: "all", category: "favorites" })
  expect(favorites.length).toBe(2)
  expect(favorites.every((i) => i.favorite)).toBe(true)
})

test("vaultFilterApply filters by category type", () => {
  const logins = vaultFilterApply(testItems, { vault: "all", category: "login" })
  expect(logins.length).toBe(2)

  const sshKeys = vaultFilterApply(testItems, { vault: "all", category: "sshKey" })
  expect(sshKeys.length).toBe(1)
  expect(sshKeys[0]?.id).toBe("item-3")
})

test("vaultFilterApply filters by folder name and folderId", () => {
  const byName = vaultFilterApply(testItems, { vault: "all", category: "all", folder: "Development" })
  expect(byName.length).toBe(1)
  expect(byName[0]?.id).toBe("item-1")

  const byId = vaultFilterApply(testItems, { vault: "all", category: "all", folder: "folder-infra" })
  expect(byId.length).toBe(1)
  expect(byId[0]?.id).toBe("item-3")
})

test("vaultFilterApply filters by collectionId", () => {
  const colResult = vaultFilterApply(testItems, {
    vault: "all",
    category: "all",
    collection: "col-engineering",
  })
  expect(colResult.length).toBe(1)
  expect(colResult[0]?.id).toBe("item-1")
})

test("vaultFilterApply filters by search query matching title, username, url, notes, custom fields", () => {
  const titleSearch = vaultFilterApply(testItems, { vault: "all", category: "all", search: "github" })
  expect(titleSearch.length).toBe(1)
  expect(titleSearch[0]?.id).toBe("item-1")

  const usernameSearch = vaultFilterApply(testItems, { vault: "all", category: "all", search: "alex@gmail" })
  expect(usernameSearch.length).toBe(1)
  expect(usernameSearch[0]?.id).toBe("item-2")

  const noteSearch = vaultFilterApply(testItems, { vault: "all", category: "all", search: "bastion" })
  expect(noteSearch.length).toBe(1)
  expect(noteSearch[0]?.id).toBe("item-3")

  const customFieldSearch = vaultFilterApply(testItems, { vault: "all", category: "all", search: "ORG-9842" })
  expect(customFieldSearch.length).toBe(1)
  expect(customFieldSearch[0]?.id).toBe("item-1")
})
