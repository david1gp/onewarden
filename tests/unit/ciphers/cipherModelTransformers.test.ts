import { describe, expect, test } from "bun:test"
import { cipherCardBrandDetect } from "../../../src/web/ciphers/model/cipherCardBrandDetect.js"
import { cipherCardFormat } from "../../../src/web/ciphers/model/cipherCardFormat.js"
import { cipherItemFromDemo } from "../../../src/web/ciphers/model/cipherItemFromDemo.js"
import { cipherItemFromWire } from "../../../src/web/ciphers/model/cipherItemFromWire.js"
import { cipherItemToWire } from "../../../src/web/ciphers/model/cipherItemToWire.js"
import { cipherPasswordStrengthCalculate } from "../../../src/web/ciphers/model/cipherPasswordStrengthCalculate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"

describe("cipherCardBrandDetect", () => {
  test("detects Visa, Mastercard, Amex, Discover", () => {
    expect(cipherCardBrandDetect("4242424242424242")).toBe("Visa")
    expect(cipherCardBrandDetect("5500000000000004")).toBe("Mastercard")
    expect(cipherCardBrandDetect("378282246310005")).toBe("American Express")
    expect(cipherCardBrandDetect("6011000990139424")).toBe("Discover")
    expect(cipherCardBrandDetect("")).toBe("Unknown")
  })
})

describe("cipherCardFormat", () => {
  test("formats unmasked card numbers with space delimiters", () => {
    expect(cipherCardFormat("4242424242424242", false)).toBe("4242 4242 4242 4242")
  })

  test("formats masked card numbers showing only last 4 digits", () => {
    expect(cipherCardFormat("4242424242424242", true)).toBe("•••• •••• •••• 4242")
  })
})

describe("cipherPasswordStrengthCalculate", () => {
  test("evaluates passwords accurately", () => {
    expect(cipherPasswordStrengthCalculate("")).toBeNull()
    expect(cipherPasswordStrengthCalculate("12345")).toBe("Weak")
    expect(cipherPasswordStrengthCalculate("MyPass12")).toBe("Medium")
    expect(cipherPasswordStrengthCalculate("Pass1234#5678")).toBe("Strong")
    expect(cipherPasswordStrengthCalculate("wz9!kP#7mX2$vL9@qR5*tY8")).toBe("Very Strong")
  })
})

describe("cipherItemFromWire and cipherItemToWire", () => {
  test("transforms wire login payload to cipher item and back", () => {
    const wire = {
      id: "cipher-123",
      type: 1,
      name: "GitHub",
      notes: "Dev login",
      favorite: true,
      folderId: "folder-abc",
      fields: [{ name: "PIN", value: "9981", type: 1 }],
      login: {
        username: "alex@example.com",
        password: "SuperPassword123!",
        totp: "492018",
        uris: [{ uri: "https://github.com/login", match: null }],
        fido2Credentials: [fixtures.fido2Credential.plain],
      },
      creationDate: "2026-01-01T00:00:00Z",
      revisionDate: "2026-02-01T00:00:00Z",
    }

    const item = cipherItemFromWire(wire)
    expect(item.id).toBe("cipher-123")
    expect(item.type).toBe(1)
    expect(item.name).toBe("GitHub")
    expect(item.favorite).toBe(true)
    expect(item.login?.username).toBe("alex@example.com")
    expect(item.fields).toHaveLength(1)
    expect(item.fields[0]?.name).toBe("PIN")

    const wirePayload = cipherItemToWire(item)
    expect(wirePayload.type).toBe(1)
    expect(wirePayload.name).toBe("GitHub")
    expect(wirePayload.favorite).toBe(true)
    expect((wirePayload.login as any)?.username).toBe("alex@example.com")
    expect((wirePayload.login as any)?.fido2Credentials).toEqual([fixtures.fido2Credential.plain])
  })

  test("transforms demo VaultItem to CipherItem", () => {
    const demoItem: VaultItem = {
      id: "item-card-1",
      title: "Acme Corporate Platinum",
      category: "creditCard",
      vault: "Work",
      favorite: true,
      folder: "Finance",
      customFields: [
        { label: "Cardholder Name", value: "Alex J. Rivera" },
        { label: "Card Number", value: "4242 4242 4242 8819", concealed: true },
        { label: "Expiration", value: "09/29" },
        { label: "Security Code", value: "714", concealed: true },
      ],
      notes: "Work expenses",
      createdAt: "2025-01-01",
      updatedAt: "2026-01-01",
    }

    const cipher = cipherItemFromDemo(demoItem)
    expect(cipher.id).toBe("item-card-1")
    expect(cipher.type).toBe(3)
    expect(cipher.name).toBe("Acme Corporate Platinum")
    expect(cipher.favorite).toBe(true)
    expect(cipher.card?.cardholderName).toBe("Alex J. Rivera")
    expect(cipher.card?.expMonth).toBe("09")
    expect(cipher.card?.expYear).toBe("29")
  })

  test("transforms wire attachments, password history, collections, deletedDate and archivedDate", () => {
    const wire = {
      id: "cipher-complex-1",
      type: 1,
      name: "Complex Cipher",
      organizationId: "org-1",
      collectionIds: ["col-1", "col-2"],
      deletedDate: "2026-08-20T10:00:00Z",
      archivedDate: "2026-08-19T09:00:00Z",
      attachments: [
        {
          id: "att-1",
          fileName: "backup.key",
          size: "512",
          sizeName: "512 B",
          url: "https://example.com/att-1",
        },
      ],
      passwordHistory: [{ password: "HistoricalPassword123!", lastUsedDate: "2025-12-01T00:00:00.000000Z" }],
      fields: [],
    }

    const item = cipherItemFromWire(wire)
    expect(item.id).toBe("cipher-complex-1")
    expect(item.organizationId).toBe("org-1")
    expect(item.collectionIds).toEqual(["col-1", "col-2"])
    expect(item.deletedDate).toBe("2026-08-20T10:00:00Z")
    expect(item.archivedDate).toBe("2026-08-19T09:00:00Z")
    expect(item.attachments).toHaveLength(1)
    expect(item.attachments?.[0]?.fileName).toBe("backup.key")
    expect(item.passwordHistory).toHaveLength(1)
    expect(item.passwordHistory?.[0]?.password).toBe("HistoricalPassword123!")
  })
})
