import { createEffect, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherFormValidate } from "../model/cipherFormValidate.js"
import type { CipherCustomField } from "../schemas/cipherCustomFieldSchema.js"
import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"

export interface CipherEditFormStateProps {
  initialItem?: () => CipherItem | null
  defaultType?: () => CipherType | undefined
  defaultUri?: () => string | null
  onSave: (data: CipherFormData) => Promise<void> | void
  onCancel: () => void
  isSaving?: () => boolean
  errorMessage?: () => string | null
}

export function cipherEditFormStateCreate(props: CipherEditFormStateProps) {
  const initial = props.initialItem?.()

  const type = createSignalObject<string>(String(initial?.type ?? props.defaultType?.() ?? 1))
  const name = createSignalObject(initial?.name ?? "")
  const notes = createSignalObject(initial?.notes ?? "")
  const favorite = createSignalObject(initial?.favorite ?? false)
  const folderId = createSignalObject(initial?.folderId ?? "")

  // Login signals
  const username = createSignalObject(initial?.login?.username ?? "")
  const password = createSignalObject(initial?.login?.password ?? "")
  const totp = createSignalObject(initial?.login?.totp ?? "")
  const defaultUri = initial === undefined ? (props.defaultUri?.() ?? "") : ""
  const uri = createSignalObject(initial?.login?.uris?.[0]?.uri ?? defaultUri)
  const loginUris = createSignalObject<NonNullable<CipherFormData["uris"]>>(
    initial?.login?.uris?.map((entry) => ({ uri: entry.uri, match: entry.match })) ??
      (defaultUri === "" ? [] : [{ uri: defaultUri, match: null }]),
  )
  const fido2Credentials = createSignalObject<CipherFormData["fido2Credentials"]>(initial?.login?.fido2Credentials)

  // Card signals
  const cardholderName = createSignalObject(initial?.card?.cardholderName ?? "")
  const brand = createSignalObject(initial?.card?.brand ?? "Visa")
  const number = createSignalObject(initial?.card?.number ?? "")
  const expMonth = createSignalObject(initial?.card?.expMonth ?? "")
  const expYear = createSignalObject(initial?.card?.expYear ?? "")
  const code = createSignalObject(initial?.card?.code ?? "")

  // Identity signals
  const title = createSignalObject(initial?.identity?.title ?? "")
  const firstName = createSignalObject(initial?.identity?.firstName ?? "")
  const middleName = createSignalObject(initial?.identity?.middleName ?? "")
  const lastName = createSignalObject(initial?.identity?.lastName ?? "")
  const company = createSignalObject(initial?.identity?.company ?? "")
  const email = createSignalObject(initial?.identity?.email ?? "")
  const phone = createSignalObject(initial?.identity?.phone ?? "")
  const address1 = createSignalObject(initial?.identity?.address1 ?? "")
  const address2 = createSignalObject(initial?.identity?.address2 ?? "")
  const address3 = createSignalObject(initial?.identity?.address3 ?? "")
  const city = createSignalObject(initial?.identity?.city ?? "")
  const state = createSignalObject(initial?.identity?.state ?? "")
  const postalCode = createSignalObject(initial?.identity?.postalCode ?? "")
  const country = createSignalObject(initial?.identity?.country ?? "")
  const ssn = createSignalObject(initial?.identity?.ssn ?? "")
  const passportNumber = createSignalObject(initial?.identity?.passportNumber ?? "")
  const licenseNumber = createSignalObject(initial?.identity?.licenseNumber ?? "")
  const identityUsername = createSignalObject(initial?.identity?.username ?? "")

  // Custom fields
  const fields = createSignalObject<CipherCustomField[]>(initial?.fields ? [...initial.fields] : [])

  // Validation error
  const localError = createSignalObject<string | null>(null)

  // Re-populate if initial item changes
  createEffect(() => {
    const item = props.initialItem?.()
    if (item) {
      type.set(String(item.type))
      name.set(item.name)
      notes.set(item.notes ?? "")
      favorite.set(item.favorite)
      folderId.set(item.folderId ?? "")
      username.set(item.login?.username ?? "")
      password.set(item.login?.password ?? "")
      totp.set(item.login?.totp ?? "")
      uri.set(item.login?.uris?.[0]?.uri ?? "")
      loginUris.set(item.login?.uris?.map((entry) => ({ uri: entry.uri, match: entry.match })) ?? [])
      fido2Credentials.set(item.login?.fido2Credentials)
      cardholderName.set(item.card?.cardholderName ?? "")
      brand.set(item.card?.brand ?? "Visa")
      number.set(item.card?.number ?? "")
      expMonth.set(item.card?.expMonth ?? "")
      expYear.set(item.card?.expYear ?? "")
      code.set(item.card?.code ?? "")
      title.set(item.identity?.title ?? "")
      firstName.set(item.identity?.firstName ?? "")
      middleName.set(item.identity?.middleName ?? "")
      lastName.set(item.identity?.lastName ?? "")
      company.set(item.identity?.company ?? "")
      email.set(item.identity?.email ?? "")
      phone.set(item.identity?.phone ?? "")
      address1.set(item.identity?.address1 ?? "")
      address2.set(item.identity?.address2 ?? "")
      address3.set(item.identity?.address3 ?? "")
      city.set(item.identity?.city ?? "")
      state.set(item.identity?.state ?? "")
      postalCode.set(item.identity?.postalCode ?? "")
      country.set(item.identity?.country ?? "")
      ssn.set(item.identity?.ssn ?? "")
      passportNumber.set(item.identity?.passportNumber ?? "")
      licenseNumber.set(item.identity?.licenseNumber ?? "")
      identityUsername.set(item.identity?.username ?? "")
      fields.set([...item.fields])
    }
  })

  const numericType = createMemo(() => Number.parseInt(type.get(), 10) as CipherType)

  const isEditMode = createMemo(() => !!props.initialItem?.())

  const typeOptions = () => ["1", "2", "3", "4"]
  const typeLabel = (v: string) => {
    switch (v) {
      case "1":
        return "Login"
      case "2":
        return "Secure Note"
      case "3":
        return "Credit Card"
      case "4":
        return "Identity"
      default:
        return "Login"
    }
  }

  const handleSave = async (e?: Event) => {
    if (e) e.preventDefault()
    localError.set(null)

    const typeNum = numericType()
    const loginUrisForSubmit =
      typeNum === 1
        ? [
            { uri: uri.get().trim(), match: loginUris.get()[0]?.match ?? null },
            ...loginUris
              .get()
              .slice(1)
              .map((entry) => ({ ...entry, uri: entry.uri.trim() })),
          ].filter((entry) => entry.uri.length > 0)
        : []
    const firstLoginUri = loginUrisForSubmit[0]?.uri
    const formInput: CipherFormData = {
      type: typeNum,
      name: name.get().trim(),
      notes: notes.get().trim() || undefined,
      favorite: favorite.get(),
      folderId: folderId.get().trim() || null,
      username:
        typeNum === 1
          ? username.get().trim() || undefined
          : typeNum === 4
            ? identityUsername.get().trim() || undefined
            : undefined,
      password: typeNum === 1 ? password.get() || undefined : undefined,
      totp: typeNum === 1 ? totp.get().trim() || undefined : undefined,
      uri: typeNum === 1 ? firstLoginUri : undefined,
      uris: typeNum === 1 ? loginUrisForSubmit : undefined,
      fido2Credentials: typeNum === 1 ? fido2Credentials.get() : undefined,
      cardholderName: typeNum === 3 ? cardholderName.get().trim() || undefined : undefined,
      brand: typeNum === 3 ? brand.get() || undefined : undefined,
      number: typeNum === 3 ? number.get().trim() || undefined : undefined,
      expMonth: typeNum === 3 ? expMonth.get().trim() || undefined : undefined,
      expYear: typeNum === 3 ? expYear.get().trim() || undefined : undefined,
      code: typeNum === 3 ? code.get().trim() || undefined : undefined,
      title: typeNum === 4 ? title.get().trim() || undefined : undefined,
      firstName: typeNum === 4 ? firstName.get().trim() || undefined : undefined,
      middleName: typeNum === 4 ? middleName.get().trim() || undefined : undefined,
      lastName: typeNum === 4 ? lastName.get().trim() || undefined : undefined,
      company: typeNum === 4 ? company.get().trim() || undefined : undefined,
      email: typeNum === 4 ? email.get().trim() || undefined : undefined,
      phone: typeNum === 4 ? phone.get().trim() || undefined : undefined,
      address1: typeNum === 4 ? address1.get().trim() || undefined : undefined,
      address2: typeNum === 4 ? address2.get().trim() || undefined : undefined,
      address3: typeNum === 4 ? address3.get().trim() || undefined : undefined,
      city: typeNum === 4 ? city.get().trim() || undefined : undefined,
      state: typeNum === 4 ? state.get().trim() || undefined : undefined,
      postalCode: typeNum === 4 ? postalCode.get().trim() || undefined : undefined,
      country: typeNum === 4 ? country.get().trim() || undefined : undefined,
      ssn: typeNum === 4 ? ssn.get().trim() || undefined : undefined,
      passportNumber: typeNum === 4 ? passportNumber.get().trim() || undefined : undefined,
      licenseNumber: typeNum === 4 ? licenseNumber.get().trim() || undefined : undefined,
      fields: fields.get(),
    }

    const validationResult = cipherFormValidate(formInput)
    if (!validationResult.success) {
      localError.set(validationResult.errorMessage)
      return
    }

    await props.onSave(validationResult.data)
  }

  const effectiveError = createMemo(() => {
    return localError.get() || props.errorMessage?.() || null
  })

  return {
    type,
    numericType,
    name,
    notes,
    favorite,
    folderId,
    username,
    password,
    totp,
    uri,
    loginUris,
    cardholderName,
    brand,
    number,
    expMonth,
    expYear,
    code,
    title,
    firstName,
    middleName,
    lastName,
    company,
    email,
    phone,
    address1,
    address2,
    address3,
    city,
    state,
    postalCode,
    country,
    ssn,
    passportNumber,
    licenseNumber,
    identityUsername,
    fields,
    isEditMode,
    isSaving: () => props.isSaving?.() ?? false,
    effectiveError,
    typeOptions,
    typeLabel,
    handleSave,
    handleCancel: props.onCancel,
  }
}
