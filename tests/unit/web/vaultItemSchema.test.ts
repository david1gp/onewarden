import { expect, test } from "bun:test"
import * as v from "valibot"
import { vaultDemoData } from "../../../src/web/demo/vaultDemoData.js"
import { vaultItemSchema } from "../../../src/web/demo/vaultItemSchema.js"

const standardItemTypes = ["login", "secureNote", "creditCard", "identity", "sshKey"] as const

function alignedItemCreate(
  category: string,
  ownership: "personal" | "organization",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `${ownership}-${category}`,
    title: `${ownership} ${category}`,
    category,
    ownership,
    organizationId: ownership === "organization" ? "organization-acme" : null,
    collectionIds: ownership === "organization" ? ["collection-engineering"] : [],
    folderId: "folder-local",
    favorite: false,
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  }
}

test("vault item schema accepts the five standard web-vault item types and rejects legacy demo types", () => {
  for (const category of standardItemTypes) {
    expect(v.safeParse(vaultItemSchema, alignedItemCreate(category, "personal")).success).toBe(true)
  }

  for (const category of ["password", "server"]) {
    expect(v.safeParse(vaultItemSchema, alignedItemCreate(category, "personal")).success).toBe(false)
  }
})

test("vault item schema keeps ownership, collections, and folders as separate concepts", () => {
  const personal = v.safeParse(vaultItemSchema, alignedItemCreate("login", "personal"))
  const organization = v.safeParse(vaultItemSchema, alignedItemCreate("login", "organization"))
  const organizationWithoutCollection = v.safeParse(
    vaultItemSchema,
    alignedItemCreate("login", "organization", { collectionIds: [] }),
  )

  expect(personal.success).toBe(true)
  expect(organization.success).toBe(true)
  expect(organizationWithoutCollection.success).toBe(false)
})

test("demo fixtures use only standard item types and do not flatten ownership into peer vaults", () => {
  expect(
    vaultDemoData.every((item) => standardItemTypes.includes(item.category as (typeof standardItemTypes)[number])),
  ).toBe(true)
  expect(vaultDemoData.every((item) => "ownership" in item && "collectionIds" in item && "folderId" in item)).toBe(true)
})
