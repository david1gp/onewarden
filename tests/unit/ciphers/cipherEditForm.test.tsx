import { render } from "@solidjs/testing-library"
import { describe, expect, test } from "bun:test"
import type { CipherFormData } from "../../../src/web/ciphers/schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { CipherEditForm } from "../../../src/web/ciphers/ui/CipherEditForm.jsx"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"

describe("CipherEditForm component", () => {
  test("renders create form and saves valid login cipher", async () => {
    let savedData: CipherFormData | null = null
    let cancelCalled = false

    const screen = render(() => (
      <CipherEditForm
        onSave={(data) => {
          savedData = data
        }}
        onCancel={() => {
          cancelCalled = true
        }}
      />
    ))

    expect(screen.getByText("Add New Item")).toBeDefined()

    // Fill name
    const nameInput = screen.getByPlaceholderText(/e\.g\. GitHub Account/i) as HTMLInputElement
    nameInput.value = "Stripe Dashboard"
    nameInput.dispatchEvent(new Event("input", { bubbles: true }))

    // Fill username
    const usernameInput = screen.getByPlaceholderText(/e\.g\. user@example\.com/i) as HTMLInputElement
    usernameInput.value = "stripe@company.com"
    usernameInput.dispatchEvent(new Event("input", { bubbles: true }))

    // Fill password
    const passwordInput = screen.getByPlaceholderText(/Enter password/i) as HTMLInputElement
    passwordInput.value = "MySecretPass99$"
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }))

    // Submit form
    const saveButtons = screen.getAllByText("Save Item")
    expect(saveButtons.length).toBeGreaterThanOrEqual(1)
    saveButtons[0]!.click()

    expect(savedData).not.toBeNull()
    if (savedData) {
      expect((savedData as CipherFormData).name).toBe("Stripe Dashboard")
      expect((savedData as CipherFormData).type).toBe(1)
      expect((savedData as CipherFormData).username).toBe("stripe@company.com")
      expect((savedData as CipherFormData).password).toBe("MySecretPass99$")
    }

    // Cancel button
    const cancelBtns = screen.getAllByText("Cancel")
    expect(cancelBtns.length).toBeGreaterThanOrEqual(1)
    cancelBtns[0]!.click()
    expect(cancelCalled).toBe(true)

    screen.unmount()
  })

  test("prepopulates form in edit mode from initialItem", () => {
    const existingItem: CipherItem = {
      id: "cipher-existing-1",
      type: 2,
      name: "Office Wi-Fi Pass",
      notes: "SSID: OfficeNet, Pass: secret123",
      favorite: true,
      fields: [],
      reprompt: 0,
    }

    const screen = render(() => (
      <CipherEditForm initialItem={() => existingItem} onSave={() => {}} onCancel={() => {}} />
    ))

    expect(screen.getByText("Edit Cipher")).toBeDefined()
    const nameInput = screen.getByPlaceholderText(/e\.g\. GitHub Account/i) as HTMLInputElement
    expect(nameInput.value).toBe("Office Wi-Fi Pass")

    const notesTextarea = screen.getByPlaceholderText(/Enter confidential notes/i) as HTMLTextAreaElement
    expect(notesTextarea.value).toBe("SSID: OfficeNet, Pass: secret123")

    screen.unmount()
  })

  test("preserves FIDO2 credentials when editing unrelated login fields", () => {
    let savedData: CipherFormData | null = null
    const existingItem: CipherItem = {
      id: "cipher-passkey-1",
      type: 1,
      name: "Passkey login",
      favorite: false,
      fields: [],
      login: {
        username: "user@example.test",
        password: "password",
        totp: null,
        uris: [{ uri: "https://example.test", match: null }],
        fido2Credentials: [fixtures.fido2Credential.plain],
      },
    }
    const screen = render(() => (
      <CipherEditForm
        initialItem={() => existingItem}
        onSave={(data) => {
          savedData = data
        }}
        onCancel={() => {}}
      />
    ))

    screen.getAllByText("Save Item")[0]!.click()

    expect(savedData).not.toBeNull()
    expect((savedData as CipherFormData | null)?.fido2Credentials).toEqual([fixtures.fido2Credential.plain])
    screen.unmount()
  })
})
