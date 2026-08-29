import type { VaultSyncResponse } from "../../../src/web/vault/model/vaultSyncResponseSchema.js"

export function vaultBrowserMockDataCreate(): VaultSyncResponse {
  return {
    object: "sync",
    profile: {
      id: "usr-browser-test-1",
      name: "Alex Rivera",
      email: "alex@example.com",
      organizations: [
        {
          id: "org-acme-corp",
          name: "Acme Corporation",
          status: 2,
          type: 0,
          enabled: true,
        },
      ],
    },
    folders: [
      { id: "folder-infra", name: "Infrastructure", object: "folder" },
      { id: "folder-personal", name: "Personal", object: "folder" },
    ],
    collections: [
      {
        id: "col-engineering",
        organizationId: "org-acme-corp",
        name: "Engineering Shared",
        object: "collection",
      },
    ],
    ciphers: [
      {
        id: "cipher-aws-prod",
        type: 1,
        name: "AWS Production Console",
        favorite: true,
        folderId: "folder-infra",
        organizationId: "org-acme-corp",
        collectionIds: ["col-engineering"],
        login: {
          username: "admin-ops",
          password: "SuperSecretPassword123!",
          uri: "https://signin.aws.amazon.com/console",
          totp: "123456",
        },
        notes: "Production root account credentials. Keep secure.",
        fields: [
          { type: 0, name: "Account ID", value: "1234-5678-9012" },
          { type: 1, name: "API Secret Key", value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
        ],
        revisionDate: "2026-08-28T00:00:00.000Z",
        creationDate: "2026-08-01T00:00:00.000Z",
        deletedDate: null,
      },
      {
        id: "cipher-secure-note",
        type: 2,
        name: "Server Backup Recovery Key",
        favorite: false,
        folderId: "folder-infra",
        organizationId: null,
        collectionIds: [],
        notes: "Emergency recovery key for offsite cold backups: RECOVERY-9876-5432-10",
        revisionDate: "2026-08-28T00:00:00.000Z",
        creationDate: "2026-08-01T00:00:00.000Z",
        deletedDate: null,
      },
      {
        id: "cipher-card",
        type: 3,
        name: "Corporate Purchasing Card",
        favorite: false,
        folderId: null,
        organizationId: "org-acme-corp",
        collectionIds: ["col-engineering"],
        card: {
          cardholderName: "Alex Rivera",
          brand: "Visa",
          number: "4111111111111234",
          expMonth: "12",
          expYear: "2028",
          code: "123",
        },
        revisionDate: "2026-08-28T00:00:00.000Z",
        creationDate: "2026-08-01T00:00:00.000Z",
        deletedDate: null,
      },
    ],
  }
}
