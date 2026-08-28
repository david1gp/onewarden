/** One editable custom field row of the create-login form; boolean values are kept as "true"/"false". */
export interface ExtensionFullWindowCreateField {
  id: string
  name: string
  type: "text" | "hidden" | "boolean"
  value: string
}
