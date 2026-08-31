/** One copyable value shown on an extension login presentation. */
export interface ExtensionCopyableField {
  /** Stable key within a login, e.g. `username`, `password`, `uri:<index>`, `notes` or `custom:<index>`. */
  key: string
  label: string
  value: string
  /** Sensitive values are never rendered, only copied. */
  sensitive?: boolean
}
