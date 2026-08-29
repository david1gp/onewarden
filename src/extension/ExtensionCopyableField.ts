/** One copyable value shown on an extension login presentation. */
export interface ExtensionCopyableField {
  /** Stable key within a login, e.g. `username`, `password`, `uri`, `notes` or `custom:<name>`. */
  key: string
  label: string
  value: string
  /** Sensitive values are never rendered, only copied. */
  sensitive?: boolean
}
