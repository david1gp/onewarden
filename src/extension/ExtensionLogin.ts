import type { ExtensionCopyableField } from "./ExtensionCopyableField.js"

/** A decrypted login entry as an extension surface renders it. */
export interface ExtensionLogin {
  id: string
  name: string
  username: string | null
  uri: string | null
  /** Standard and custom fields the user may copy, in display order. */
  copyableFields: ExtensionCopyableField[]
}
