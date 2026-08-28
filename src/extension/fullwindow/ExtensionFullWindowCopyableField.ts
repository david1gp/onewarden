/** One copyable value shown in the full-window detail pane. */
export interface ExtensionFullWindowCopyableField {
  /** Stable key within a login, e.g. `username`, `password`, `uri`, `notes` or `custom:<name>`. */
  key: string
  label: string
  value: string
  /** Sensitive values are never rendered, only copied. */
  sensitive?: boolean
}
