import type { ExtensionPopupCopyableField } from "./ExtensionPopupCopyableField.js"

/** A decrypted login entry as the popup renders it. */
export interface ExtensionPopupLogin {
  id: string
  name: string
  username: string | null
  uri: string | null
  /** Standard and custom fields the user may copy, in display order. */
  copyableFields: ExtensionPopupCopyableField[]
}
