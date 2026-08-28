import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionFullWindowCreateField } from "./ExtensionFullWindowCreateField.js"

/** Draft values of the full-window create-login form before validation. */
export interface ExtensionFullWindowCreateFormValues {
  draftId: string
  name: string
  uris: string[]
  username: string
  password: string
  notes: string
  favorite: boolean
  folderId: string
  fields: ExtensionFullWindowCreateField[]
}

/**
 * Maps the create form onto the domain create request.
 * Empty optional values become null so the background never encrypts placeholder text.
 */
export function extensionFullWindowCreateRequestCreate(
  values: ExtensionFullWindowCreateFormValues,
): ExtensionCreateLoginRequest {
  const folderId = values.folderId.trim()
  return {
    draftId: values.draftId,
    name: values.name.trim(),
    uris: values.uris.map((uri) => uri.trim()).filter((uri) => uri !== ""),
    username: values.username === "" ? null : values.username,
    password: values.password === "" ? null : values.password,
    notes: values.notes === "" ? null : values.notes,
    favorite: values.favorite,
    folderId: folderId === "" ? null : folderId,
    fields: values.fields.map((field) => ({
      name: field.name.trim(),
      type: field.type,
      value: field.type === "boolean" ? field.value === "true" : field.value,
    })),
  }
}
