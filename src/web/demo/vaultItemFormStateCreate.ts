import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultAvailableCollectionsResolve } from "./vaultAvailableCollectionsResolve.js"
import { vaultAvailableFoldersResolve } from "./vaultAvailableFoldersResolve.js"
import { vaultCategoryLabelResolve } from "./vaultCategoryLabelResolve.js"
import { vaultDemoStore } from "./vaultDemoStore.js"
import type { VaultItemCustomField } from "./vaultItemCustomFieldSchema.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultItemFormProps {
  mode: "add" | "edit"
  item?: () => VaultItem | null
  initialCategory?: VaultItem["category"]
  onSave: (item: VaultItem) => void
  onCancel: () => void
}

function customFieldValueFind(customFields: readonly VaultItemCustomField[] | undefined, label: string): string {
  if (!customFields) return ""
  const match = customFields.find((field) => field.label.trim().toLowerCase() === label.trim().toLowerCase())
  return match?.value ?? ""
}

export function vaultItemFormStateCreate(props: VaultItemFormProps) {
  const currentItem = () => props.item?.() ?? null
  const initial = currentItem()

  const id = initial?.id ?? ""
  const title = createSignalObject(initial?.title ?? "")
  const category = createSignalObject<VaultItem["category"]>(initial?.category ?? props.initialCategory ?? "login")
  const ownership = createSignalObject<VaultItem["ownership"]>(initial?.ownership ?? "personal")
  const collectionIds = createSignalObject<string[]>(initial?.collectionIds ? [...initial.collectionIds] : [])
  const folder = createSignalObject<string>(initial?.folder ?? "")
  const favorite = createSignalObject<boolean>(initial?.ownership === "personal" ? Boolean(initial?.favorite) : false)

  // Login & common fields
  const username = createSignalObject(initial?.username ?? "")
  const password = createSignalObject(initial?.password ?? "")
  const url = createSignalObject(initial?.url ?? "")
  const totp = createSignalObject(initial?.totp ?? "")
  const notes = createSignalObject(initial?.notes ?? "")

  // Card specific fields
  const cardholderName = createSignalObject(customFieldValueFind(initial?.customFields, "Cardholder Name"))
  const cardNumber = createSignalObject(customFieldValueFind(initial?.customFields, "Card Number"))
  const cardExpiration = createSignalObject(customFieldValueFind(initial?.customFields, "Expiration"))
  const cardCvv = createSignalObject(
    customFieldValueFind(initial?.customFields, "Security Code (CVV)") ||
      customFieldValueFind(initial?.customFields, "CVV"),
  )

  // Identity specific fields
  const identityFullName = createSignalObject(customFieldValueFind(initial?.customFields, "Full Name"))
  const identityTitle = createSignalObject(customFieldValueFind(initial?.customFields, "Title"))
  const identityEmployeeId = createSignalObject(
    customFieldValueFind(initial?.customFields, "Employee ID") ||
      customFieldValueFind(initial?.customFields, "ID Number") ||
      customFieldValueFind(initial?.customFields, "Passport Number"),
  )
  const identityEmail = createSignalObject(
    customFieldValueFind(initial?.customFields, "Work Email") || customFieldValueFind(initial?.customFields, "Email"),
  )
  const identityPhone = createSignalObject(
    customFieldValueFind(initial?.customFields, "Office Phone") || customFieldValueFind(initial?.customFields, "Phone"),
  )
  const identityDepartment = createSignalObject(
    customFieldValueFind(initial?.customFields, "Department") ||
      customFieldValueFind(initial?.customFields, "Nationality"),
  )

  // SSH Key specific fields
  const sshKeyType = createSignalObject(customFieldValueFind(initial?.customFields, "Key Type") || "Ed25519")
  const sshFingerprint = createSignalObject(customFieldValueFind(initial?.customFields, "Fingerprint"))
  const sshPublicKey = createSignalObject(customFieldValueFind(initial?.customFields, "Public Key"))
  const sshPassphrase = createSignalObject(customFieldValueFind(initial?.customFields, "Passphrase"))

  // Additional generic custom fields
  const standardFieldLabels = new Set([
    "cardholder name",
    "card number",
    "expiration",
    "security code (cvv)",
    "cvv",
    "full name",
    "title",
    "employee id",
    "id number",
    "passport number",
    "work email",
    "email",
    "office phone",
    "phone",
    "department",
    "nationality",
    "key type",
    "fingerprint",
    "public key",
    "passphrase",
  ])

  const initialExtraCustomFields: VaultItemCustomField[] = initial?.customFields
    ? initial.customFields.filter((field) => !standardFieldLabels.has(field.label.trim().toLowerCase()))
    : []

  const extraCustomFields = createSignalObject<VaultItemCustomField[]>(
    initialExtraCustomFields.map((field) => ({ ...field })),
  )

  const isPasswordRevealed = createSignalObject(false)
  const validationError = createSignalObject<string | null>(null)

  const availableCollections = vaultAvailableCollectionsResolve()
  const availableFolders = createMemo(() => vaultAvailableFoldersResolve(vaultDemoStore.activeItems()))

  const handleOwnershipChange = (nextOwnership: VaultItem["ownership"]) => {
    ownership.set(nextOwnership)
    validationError.set(null)
    if (nextOwnership === "personal") {
      collectionIds.set([])
      return
    }
    favorite.set(false)
    if (collectionIds.get().length === 0) {
      collectionIds.set(["collection-engineering"])
    }
  }

  const handleCollectionToggle = (collectionId: string) => {
    const current = collectionIds.get()
    if (current.includes(collectionId)) {
      collectionIds.set(current.filter((id) => id !== collectionId))
      return
    }
    collectionIds.set([...current, collectionId])
  }

  const handleAddCustomField = () => {
    extraCustomFields.set([...extraCustomFields.get(), { label: "", value: "", concealed: false }])
  }

  const handleUpdateCustomField = (index: number, field: Partial<VaultItemCustomField>) => {
    const list = [...extraCustomFields.get()]
    const item = list[index]
    if (!item) return
    list[index] = { ...item, ...field }
    extraCustomFields.set(list)
  }

  const handleRemoveCustomField = (index: number) => {
    extraCustomFields.set(extraCustomFields.get().filter((_, i) => i !== index))
  }

  const handleTogglePasswordReveal = () => {
    isPasswordRevealed.set(!isPasswordRevealed.get())
  }

  const handleSave = () => {
    const trimmedTitle = title.get().trim()
    if (!trimmedTitle) {
      validationError.set("Item name is required.")
      return
    }

    const currentOwnership = ownership.get()
    const currentCategory = category.get()
    const currentCollections = collectionIds.get()

    if (currentOwnership === "organization" && currentCollections.length === 0) {
      validationError.set("At least one collection is required for organization items.")
      return
    }

    // Build customFields array according to category
    const builtCustomFields: VaultItemCustomField[] = []

    if (currentCategory === "creditCard") {
      if (cardholderName.get().trim()) {
        builtCustomFields.push({
          label: "Cardholder Name",
          value: cardholderName.get().trim(),
        })
      }
      if (cardNumber.get().trim()) {
        builtCustomFields.push({
          label: "Card Number",
          value: cardNumber.get().trim(),
          concealed: true,
        })
      }
      if (cardExpiration.get().trim()) {
        builtCustomFields.push({
          label: "Expiration",
          value: cardExpiration.get().trim(),
        })
      }
      if (cardCvv.get().trim()) {
        builtCustomFields.push({
          label: "Security Code (CVV)",
          value: cardCvv.get().trim(),
          concealed: true,
        })
      }
    } else if (currentCategory === "identity") {
      if (identityFullName.get().trim()) {
        builtCustomFields.push({
          label: "Full Name",
          value: identityFullName.get().trim(),
        })
      }
      if (identityTitle.get().trim()) {
        builtCustomFields.push({
          label: "Title",
          value: identityTitle.get().trim(),
        })
      }
      if (identityEmployeeId.get().trim()) {
        builtCustomFields.push({
          label: "Employee ID",
          value: identityEmployeeId.get().trim(),
        })
      }
      if (identityEmail.get().trim()) {
        builtCustomFields.push({
          label: "Work Email",
          value: identityEmail.get().trim(),
        })
      }
      if (identityPhone.get().trim()) {
        builtCustomFields.push({
          label: "Office Phone",
          value: identityPhone.get().trim(),
        })
      }
      if (identityDepartment.get().trim()) {
        builtCustomFields.push({
          label: "Department",
          value: identityDepartment.get().trim(),
        })
      }
    } else if (currentCategory === "sshKey") {
      if (sshKeyType.get().trim()) {
        builtCustomFields.push({
          label: "Key Type",
          value: sshKeyType.get().trim(),
        })
      }
      if (sshFingerprint.get().trim()) {
        builtCustomFields.push({
          label: "Fingerprint",
          value: sshFingerprint.get().trim(),
        })
      }
      if (sshPublicKey.get().trim()) {
        builtCustomFields.push({
          label: "Public Key",
          value: sshPublicKey.get().trim(),
        })
      }
      if (sshPassphrase.get().trim()) {
        builtCustomFields.push({
          label: "Passphrase",
          value: sshPassphrase.get().trim(),
          concealed: true,
        })
      }
    }

    // Append extra custom fields
    for (const extra of extraCustomFields.get()) {
      if (extra.label.trim() && extra.value.trim()) {
        builtCustomFields.push({
          label: extra.label.trim(),
          value: extra.value.trim(),
          ...(extra.concealed ? { concealed: true } : {}),
        })
      }
    }

    const itemToSave: VaultItem = {
      id: id || `item-${Date.now()}`,
      title: trimmedTitle,
      category: currentCategory,
      ownership: currentOwnership,
      organizationId: currentOwnership === "organization" ? (initial?.organizationId ?? "organization-acme") : null,
      collectionIds: currentOwnership === "organization" ? currentCollections : [],
      folderId: folder.get().trim() ? `folder-${folder.get().toLowerCase()}` : null,
      folder: folder.get().trim() || null,
      vault: currentOwnership === "organization" ? "Work" : "Personal",
      favorite: currentOwnership === "personal" ? favorite.get() : false,
      deletedAt: null,
      notes: notes.get().trim() || undefined,
      username:
        currentCategory === "login" || currentCategory === "sshKey" ? username.get().trim() || undefined : undefined,
      password: currentCategory === "login" ? password.get().trim() || undefined : undefined,
      url: currentCategory === "login" || currentCategory === "sshKey" ? url.get().trim() || undefined : undefined,
      totp: currentCategory === "login" ? totp.get().trim() || undefined : undefined,
      customFields: builtCustomFields.length > 0 ? builtCustomFields : undefined,
      createdAt: initial?.createdAt ?? "",
      updatedAt: "",
    }

    validationError.set(null)
    props.onSave(itemToSave)
  }

  return {
    mode: props.mode,
    title: title.get,
    setTitle: title.set,
    category: category.get,
    setCategory: category.set,
    ownership: ownership.get,
    setOwnership: handleOwnershipChange,
    collectionIds: collectionIds.get,
    toggleCollection: handleCollectionToggle,
    folder: folder.get,
    setFolder: folder.set,
    favorite: favorite.get,
    setFavorite: favorite.set,
    username: username.get,
    setUsername: username.set,
    password: password.get,
    setPassword: password.set,
    url: url.get,
    setUrl: url.set,
    totp: totp.get,
    setTotp: totp.set,
    notes: notes.get,
    setNotes: notes.set,
    cardholderName: cardholderName.get,
    setCardholderName: cardholderName.set,
    cardNumber: cardNumber.get,
    setCardNumber: cardNumber.set,
    cardExpiration: cardExpiration.get,
    setCardExpiration: cardExpiration.set,
    cardCvv: cardCvv.get,
    setCardCvv: cardCvv.set,
    identityFullName: identityFullName.get,
    setIdentityFullName: identityFullName.set,
    identityTitle: identityTitle.get,
    setIdentityTitle: identityTitle.set,
    identityEmployeeId: identityEmployeeId.get,
    setIdentityEmployeeId: identityEmployeeId.set,
    identityEmail: identityEmail.get,
    setIdentityEmail: identityEmail.set,
    identityPhone: identityPhone.get,
    setIdentityPhone: identityPhone.set,
    identityDepartment: identityDepartment.get,
    setIdentityDepartment: identityDepartment.set,
    sshKeyType: sshKeyType.get,
    setSshKeyType: sshKeyType.set,
    sshFingerprint: sshFingerprint.get,
    setSshFingerprint: sshFingerprint.set,
    sshPublicKey: sshPublicKey.get,
    setSshPublicKey: sshPublicKey.set,
    sshPassphrase: sshPassphrase.get,
    setSshPassphrase: sshPassphrase.set,
    extraCustomFields: extraCustomFields.get,
    addCustomField: handleAddCustomField,
    updateCustomField: handleUpdateCustomField,
    removeCustomField: handleRemoveCustomField,
    isPasswordRevealed: isPasswordRevealed.get,
    togglePasswordReveal: handleTogglePasswordReveal,
    validationError: validationError.get,
    availableCollections,
    availableFolders,
    getCategoryLabel: vaultCategoryLabelResolve,
    save: handleSave,
    cancel: props.onCancel,
  }
}
