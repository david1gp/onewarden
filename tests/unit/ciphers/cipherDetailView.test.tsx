import { describe, expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
import { within } from "@testing-library/dom"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { CipherDetailView } from "../../../src/web/ciphers/ui/CipherDetailView.jsx"

describe("CipherDetailView component", () => {
  test("renders empty state when no cipher item is selected", () => {
    const screen = render(() => <CipherDetailView item={() => null} />)

    expect(screen.getByText("No Cipher Selected")).toBeDefined()
    expect(screen.getByText(/Select a cipher item from your vault/)).toBeDefined()
    screen.unmount()
  })

  test("renders login cipher details with username, totp, password reveal", () => {
    let favoriteClicked = false
    let editClicked = false

    const item: CipherItem = {
      id: "cipher-login-1",
      type: 1,
      name: "GitHub Enterprise",
      notes: "Main dev account",
      favorite: true,
      folderId: "folder-eng",
      folderName: "Engineering",
      organizationId: null,
      reprompt: 0,
      fields: [
        { name: "Recovery PIN", value: "98124", type: 1 },
        { name: "Server Region", value: "us-east-1", type: 0 },
      ],
      login: {
        username: "alex.rivera@acme.internal",
        password: "SuperSecretPassword123!",
        totp: "492 018",
        uris: [{ uri: "https://github.company.internal/login", match: null }],
        passwordRevisionDate: null,
      },
      creationDate: "2025-01-15",
      revisionDate: "2026-08-20",
      viewPassword: true,
      edit: true,
      passwordStrength: "Very Strong",
    }

    const screen = render(() => (
      <CipherDetailView
        item={() => item}
        onToggleFavorite={() => {
          favoriteClicked = true
        }}
        onEdit={() => {
          editClicked = true
        }}
      />
    ))

    expect(screen.getByText("GitHub Enterprise")).toBeDefined()
    expect(screen.getByText("alex.rivera@acme.internal")).toBeDefined()
    expect(screen.getByText("492 018")).toBeDefined()
    expect(screen.getByText("https://github.company.internal/login")).toBeDefined()
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1)

    // Test show/hide password toggle
    const hideShowButton = screen.getByLabelText("Show password")
    expect(hideShowButton).toBeDefined()
    hideShowButton.click()
    expect(screen.getByText("SuperSecretPassword123!")).toBeDefined()

    // Test favorite action button
    const favButton = screen.getByLabelText("Remove from Favorites")
    favButton.click()
    expect(favoriteClicked).toBe(true)

    // Test edit action button
    const editBtn = screen.getByText("Edit")
    editBtn.click()
    expect(editClicked).toBe(true)

    screen.unmount()
  })

  test("renders card cipher details with cardholder, number masking, cvv reveal", () => {
    const item: CipherItem = {
      id: "cipher-card-1",
      type: 3,
      name: "Acme Corporate Platinum",
      favorite: false,
      fields: [],
      card: {
        cardholderName: "Alex J. Rivera",
        brand: "Visa",
        number: "4242424242428819",
        expMonth: "09",
        expYear: "29",
        code: "714",
      },
      reprompt: 0,
    }

    const screen = render(() => <CipherDetailView item={() => item} />)

    expect(screen.getByText("Acme Corporate Platinum")).toBeDefined()
    expect(screen.getByText("Alex J. Rivera")).toBeDefined()
    expect(screen.getByText("•••• •••• •••• 8819")).toBeDefined()
    expect(screen.getByText("09/29")).toBeDefined()

    // Toggle card number reveal
    const revealCardBtn = screen.getByLabelText("Show card number")
    revealCardBtn.click()
    expect(screen.getByText("4242 4242 4242 8819")).toBeDefined()

    // Toggle CVV reveal
    const revealCvvBtn = screen.getByLabelText("Show CVV")
    revealCvvBtn.click()
    expect(screen.getByText("714")).toBeDefined()

    screen.unmount()
  })

  test("renders identity profile with name, email, phone, address, and concealed SSN", () => {
    const item: CipherItem = {
      id: "cipher-id-1",
      type: 4,
      name: "Alex Rivera Profile",
      favorite: false,
      fields: [],
      identity: {
        title: "Mr",
        firstName: "Alex",
        middleName: "Jordan",
        lastName: "Rivera",
        company: "Acme Corp",
        email: "alex@acme.com",
        phone: "+1 555-0199",
        address1: "100 Main St",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "USA",
        ssn: "123-45-6789",
        passportNumber: "P981247",
      },
      reprompt: 0,
    }

    const screen = render(() => <CipherDetailView item={() => item} />)

    expect(screen.getByText("Alex Rivera Profile")).toBeDefined()
    expect(screen.getByText("Mr Alex Jordan Rivera")).toBeDefined()
    expect(screen.getByText("alex@acme.com")).toBeDefined()
    expect(screen.getByText("+1 555-0199")).toBeDefined()
    expect(screen.getByText("•••-••-••••")).toBeDefined()

    // Toggle SSN reveal
    const revealSsnBtn = screen.getByLabelText("Show SSN")
    revealSsnBtn.click()
    expect(screen.getByText("123-45-6789")).toBeDefined()

    screen.unmount()
  })

  test("renders attachments section with download and delete actions", () => {
    let deletedAttId: string | null = null

    const item: CipherItem = {
      id: "cipher-att-item-1",
      type: 1,
      name: "Server Config",
      favorite: false,
      fields: [],
      attachments: [
        {
          id: "att-1",
          fileName: "server.cert",
          size: "2048",
          sizeName: "2.00 KB",
          url: "https://vault.example.com/attachments/cipher-att-item-1/att-1?token=test",
        },
      ],
      reprompt: 0,
      edit: true,
    }

    const screen = render(() => (
      <CipherDetailView
        item={() => item}
        onDeleteAttachment={(_id, attId) => {
          deletedAttId = attId
        }}
      />
    ))

    expect(screen.getByText("Attachments (1)")).toBeDefined()
    expect(screen.getByText("server.cert")).toBeDefined()
    expect(screen.getByText("2.00 KB")).toBeDefined()
    expect(screen.getByText("Download")).toBeDefined()

    const deleteBtn = screen.getByLabelText("Delete attachment server.cert")
    deleteBtn.click()
    expect(deletedAttId).toBe("att-1" as any)

    screen.unmount()
  })

  test("renders password history button and count for login items", () => {
    const item: CipherItem = {
      id: "cipher-login-hist-1",
      type: 1,
      name: "Google Account",
      favorite: false,
      fields: [],
      login: {
        username: "test@gmail.com",
        password: "CurrentPassword123!",
        uris: [],
      },
      passwordHistory: [
        { password: "OldPassword1!", lastUsedDate: "2025-05-10T12:00:00.000Z" },
        { password: "OlderPassword0!", lastUsedDate: "2024-01-01T00:00:00.000Z" },
      ],
      reprompt: 0,
    }

    const screen = render(() => <CipherDetailView item={() => item} />)

    expect(screen.getByText("History (2)")).toBeDefined()
    const historyBtn = screen.getByLabelText("View password history")
    expect(historyBtn).toBeDefined()

    screen.unmount()
  })

  test("renders trash banner with restore and delete permanently when cipher is deleted", () => {
    let restoreCalled = false

    const item: CipherItem = {
      id: "cipher-deleted-1",
      type: 1,
      name: "Deleted Service",
      favorite: false,
      fields: [],
      deletedDate: "2026-08-25T10:00:00.000Z",
      reprompt: 0,
    }

    const screen = render(() => (
      <CipherDetailView
        item={() => item}
        onRestore={() => {
          restoreCalled = true
        }}
      />
    ))

    expect(screen.getByText(/This cipher is in your Trash/)).toBeDefined()
    const restoreBtn = screen.getByText("Restore Cipher")
    restoreBtn.click()
    expect(restoreCalled).toBe(true)

    expect(screen.getByText("Delete Permanently")).toBeDefined()
    screen.unmount()
  })

  test("triggers clone, archive, and share actions", async () => {
    let cloneCalled = false
    let archiveCalled = false

    const item: CipherItem = {
      id: "cipher-actions-1",
      type: 1,
      name: "Stripe Production",
      favorite: false,
      fields: [],
      reprompt: 0,
      organizationId: null,
    }

    const screen = render(() => (
      <CipherDetailView
        item={() => item}
        onClone={() => {
          cloneCalled = true
        }}
        onArchive={() => {
          archiveCalled = true
        }}
      />
    ))

    const cloneBtn = screen.getByTitle("Clone cipher item")
    cloneBtn.click()
    await Promise.resolve()
    expect(cloneCalled).toBe(true)

    const archiveBtn = screen.getByTitle("Archive cipher")
    archiveBtn.click()
    await Promise.resolve()
    expect(archiveCalled).toBe(true)

    const shareBtn = screen.getByText("Share")
    expect(shareBtn).toBeDefined()

    screen.unmount()
  })

  test("closes a delete confirmation before the next selected item can inherit it", async () => {
    const firstItem: CipherItem = {
      id: "cipher-delete-source",
      type: 1,
      name: "Delete Source",
      favorite: false,
      fields: [],
      reprompt: 0,
    }
    const nextItem: CipherItem = {
      id: "cipher-delete-next",
      type: 1,
      name: "Next Cipher",
      favorite: false,
      fields: [],
      reprompt: 0,
    }
    const selectedItem = createSignalObject<CipherItem | null>(firstItem)
    let resolveDelete!: () => void
    const deletePending = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })

    const screen = render(() => (
      <CipherDetailView
        item={selectedItem.get}
        onDelete={() => {
          selectedItem.set(nextItem)
          return deletePending
        }}
      />
    ))

    const body = within(document.body)
    screen.getByTitle("Move cipher to trash").click()
    await Promise.resolve()
    const dialog = body.getByRole("dialog", { name: "Move to Trash" })
    expect(dialog).toBeDefined()
    within(dialog).getByRole("button", { name: "Move to Trash" }).click()
    await Promise.resolve()

    expect(screen.getByText("Next Cipher")).toBeDefined()
    expect(screen.getByTitle("Clone cipher item").hasAttribute("disabled")).toBe(false)
    expect(dialog.hasAttribute("data-closed")).toBe(true)

    resolveDelete()
    await Promise.resolve()
    screen.unmount()
  })
})
