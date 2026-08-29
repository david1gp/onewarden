import { expect, test } from "bun:test"
import { vaultSyncModelMap } from "../../../src/web/vault/model/vaultSyncModelMap.js"
import type { VaultSyncResponse } from "../../../src/web/vault/model/vaultSyncResponseSchema.js"

test("vaultSyncModelMap maps sync response payload to presentation models", () => {
  const syncData: VaultSyncResponse = {
    profile: {
      id: "user-123",
      name: "Alice Smith",
      email: "alice@example.com",
      organizations: [{ id: "org-456", name: "Engineering Org" }],
    },
    folders: [
      { id: "f-1", name: "Work Folders" },
      { id: "f-2", name: "Personal Folders" },
    ],
    collections: [
      {
        id: "c-1",
        organizationId: "org-456",
        name: "DevOps Secrets",
      },
    ],
    ciphers: [
      {
        id: "cip-1",
        organizationId: "org-456",
        folderId: "f-1",
        type: 1,
        name: "AWS Console",
        notes: "Admin access",
        favorite: true,
        login: {
          username: "alice_admin",
          password: "supersecretpassword",
          uris: [{ uri: "https://aws.amazon.com" }],
          totp: "123456",
        },
        collectionIds: ["c-1"],
        fields: [{ type: 1, name: "Secret PIN", value: "9988" }],
        revisionDate: "2024-03-01T00:00:00Z",
      },
      {
        id: "cip-2",
        type: 2,
        name: "Private Scratchpad",
        notes: "Confidential recovery phrases",
        favorite: false,
        folderId: "f-2",
        revisionDate: "2024-03-02T00:00:00Z",
      },
      {
        id: "cip-3",
        type: 5,
        name: "Deploy Key",
        notes: "Ed25519 deploy key",
        favorite: false,
        revisionDate: "2024-03-03T00:00:00Z",
      },
    ],
  }

  const mapped = vaultSyncModelMap(syncData)

  expect(mapped.profile.name).toBe("Alice Smith")
  expect(mapped.profile.email).toBe("alice@example.com")
  expect(mapped.folders.length).toBe(2)
  expect(mapped.collections.length).toBe(1)
  expect(mapped.items.length).toBe(3)

  const item1 = mapped.items[0]
  expect(item1?.id).toBe("cip-1")
  expect(item1?.title).toBe("AWS Console")
  expect(item1?.category).toBe("login")
  expect(item1?.vault).toBe("Engineering Org")
  expect(item1?.folder).toBe("Work Folders")
  expect(item1?.folderId).toBe("f-1")
  expect(item1?.collectionIds).toEqual(["c-1"])
  expect(item1?.username).toBe("alice_admin")
  expect(item1?.password).toBe("supersecretpassword")
  expect(item1?.url).toBe("https://aws.amazon.com")
  expect(item1?.totp).toBe("123456")
  expect(item1?.customFields?.length).toBe(1)
  expect(item1?.customFields?.[0]?.concealed).toBe(true)

  const item2 = mapped.items[1]
  expect(item2?.id).toBe("cip-2")
  expect(item2?.category).toBe("secureNote")
  expect(item2?.vault).toBe("Personal")
  expect(item2?.folder).toBe("Personal Folders")

  const item3 = mapped.items[2]
  expect(item3?.id).toBe("cip-3")
  expect(item3?.category).toBe("sshKey")
})
