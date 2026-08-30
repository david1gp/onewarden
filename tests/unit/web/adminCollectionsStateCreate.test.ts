import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCollectionsStateCreate } from "../../../src/web/demo/adminCollectionsStateCreate.js"

test("admin collection state maps organizations deterministically and searches the selected organization", () => {
  createRoot((dispose) => {
    const state = adminCollectionsStateCreate()

    try {
      expect(state.collectionsByOrganization()["organization-acme-core"]?.map((collection) => collection.id)).toEqual([
        "collection-acme-core-001",
        "collection-acme-core-002",
        "collection-acme-core-003",
        "collection-acme-core-004",
        "collection-acme-core-005",
        "collection-acme-core-006",
        "collection-acme-core-007",
        "collection-acme-core-008",
        "collection-acme-core-009",
      ])
      expect(state.collections().every((collection) => collection.organizationId === "organization-acme-core")).toBe(
        true,
      )

      state.setSearchQuery("COL-CORE-FIN")
      expect(state.filteredCollections().map((collection) => collection.name)).toEqual(["Finance & Banking"])

      expect(state.selectCollection("collection-acme-core-002").success).toBe(true)
      expect(state.selectedCollection()?.id).toBe("collection-acme-core-002")
      expect(state.selectOrganization("organization-acme-design").success).toBe(true)
      expect(state.selectedOrganization()?.name).toBe("Acme Design Studio")
      expect(state.selectedCollection()?.id).toBe("collection-acme-design-001")
      expect(state.searchQuery()).toBe("")
    } finally {
      dispose()
    }
  })
})

test("admin collection state creates, updates, and deletes collections while updating counts", () => {
  createRoot((dispose) => {
    const state = adminCollectionsStateCreate()

    try {
      const created = state.createCollection({
        externalId: " COL-CORE-AUDIT ",
        name: " Audit Review ",
        users: [{ hidePasswords: true, id: "user-alex-rivera", manage: false, readOnly: true }],
      })

      expect(created.success).toBe(true)
      if (!created.success) return
      expect(created.data).toMatchObject({
        externalId: "COL-CORE-AUDIT",
        id: "collection-organization-acme-core-010",
        name: "Audit Review",
        organizationId: "organization-acme-core",
      })
      expect(state.collectionCount("organization-acme-core")).toBe(10)
      expect(
        state.organizations().find((organization) => organization.id === "organization-acme-core")?.collectionCount,
      ).toBe(10)
      expect(state.selectedCollection()?.id).toBe(created.data.id)

      const updated = state.updateCollection(created.data.id, { name: "Audit Readiness" })
      expect(updated.success).toBe(true)
      expect(state.selectedCollection()?.name).toBe("Audit Readiness")

      const deleted = state.deleteCollection(created.data.id)
      expect(deleted.success).toBe(true)
      expect(state.collectionCount("organization-acme-core")).toBe(9)
      expect(
        state.organizations().find((organization) => organization.id === "organization-acme-core")?.collectionCount,
      ).toBe(9)
    } finally {
      dispose()
    }
  })
})

test("admin collection updates preserve existing member permissions and deletion falls back to another selection", () => {
  createRoot((dispose) => {
    const state = adminCollectionsStateCreate()

    try {
      const original = state.selectedCollection()
      expect(original?.users).toEqual([
        { hidePasswords: false, id: "user-alex-rivera", manage: true, name: "Alex Rivera", readOnly: false },
        { hidePasswords: true, id: "user-morgan-lee", manage: false, name: "Morgan Lee", readOnly: true },
      ])
      if (!original) return

      const updated = state.updateCollection(original.id, { name: "Engineering Access" })
      expect(updated.success).toBe(true)
      expect(state.selectedCollection()?.users).toEqual(original.users)

      const deleted = state.deleteCollection(original.id)
      expect(deleted.success).toBe(true)
      expect(state.selectedCollection()?.id).toBe("collection-acme-core-002")
      expect(state.selectedCollectionId()).toBe("collection-acme-core-002")
    } finally {
      dispose()
    }
  })
})
