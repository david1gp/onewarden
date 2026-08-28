import type { ExtensionFullWindowCopyableField } from "./ExtensionFullWindowCopyableField.js"

/** A decrypted login entry as the full-window vault renders it. */
export interface ExtensionFullWindowLogin {
  id: string
  name: string
  username: string | null
  uri: string | null
  /** Standard and custom fields the user may copy, in display order. */
  copyableFields: ExtensionFullWindowCopyableField[]
}
