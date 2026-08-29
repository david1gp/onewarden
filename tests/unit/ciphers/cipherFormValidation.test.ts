import { expect, describe, test } from "bun:test"
import { cipherFormValidate } from "../../../src/web/ciphers/model/cipherFormValidate.js"
import type { CipherFormData } from "../../../src/web/ciphers/schemas/cipherFormDataSchema.js"

describe("cipherFormValidate", () => {
  test("validates a valid login cipher form", () => {
    const input: CipherFormData = {
      type: 1,
      name: "GitHub",
      notes: "Dev account",
      favorite: true,
      folderId: null,
      username: "user@github.com",
      password: "SuperSecretPassword123!",
      totp: "JBSWY3DPEHPK3PXP",
      uri: "https://github.com/login",
      fields: [{ name: "Pin", value: "1234", type: 1 }],
    }

    const result = cipherFormValidate(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("GitHub")
      expect(result.data.type).toBe(1)
      expect(result.data.fields).toHaveLength(1)
    }
  })

  test("rejects missing or empty cipher name", () => {
    const input = {
      type: 1,
      name: "",
      favorite: false,
      fields: [],
    }

    const result = cipherFormValidate(input)
    expect(result.success).toBe(false)
  })

  test("validates valid card cipher form", () => {
    const input: CipherFormData = {
      type: 3,
      name: "Corporate Card",
      favorite: false,
      cardholderName: "Alex Rivera",
      brand: "Visa",
      number: "4242424242424242",
      expMonth: "08",
      expYear: "2029",
      code: "123",
      fields: [],
    }

    const result = cipherFormValidate(input)
    expect(result.success).toBe(true)
  })

  test("rejects invalid card expiration month", () => {
    const input: CipherFormData = {
      type: 3,
      name: "Invalid Month Card",
      favorite: false,
      expMonth: "13",
      expYear: "2029",
      fields: [],
    }

    const result = cipherFormValidate(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorMessage).toContain("Expiration month must be between 1 and 12")
    }
  })

  test("rejects invalid identity email format", () => {
    const input: CipherFormData = {
      type: 4,
      name: "Alex Rivera Profile",
      favorite: false,
      email: "invalid-email-address",
      fields: [],
    }

    const result = cipherFormValidate(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorMessage).toContain("Invalid email address")
    }
  })

  test("validates secure note cipher form", () => {
    const input: CipherFormData = {
      type: 2,
      name: "Recovery Seed",
      notes: "alpine meadow whisper glacier",
      favorite: true,
      fields: [],
    }

    const result = cipherFormValidate(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe("alpine meadow whisper glacier")
    }
  })
})
