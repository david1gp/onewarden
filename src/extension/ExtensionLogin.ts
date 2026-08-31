import type { ExtensionCopyableField } from "./ExtensionCopyableField.js"

/** A decrypted login entry as an extension surface renders it. */
export interface ExtensionLogin {
  id: string
  name: string
  username: string | null
  uri: string | null
  /** True when a background-only TOTP seed is available for generated-code copy. */
  totpAvailable?: boolean
  /** Standard and custom fields the user may copy, in display order. */
  copyableFields: ExtensionCopyableField[]
}
