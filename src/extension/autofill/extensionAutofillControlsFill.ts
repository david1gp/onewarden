import type { ExtensionAutofillFieldKind } from "./extensionAutofillFieldKindSchema.js"
import type { ExtensionAutofillFillValue } from "./extensionAutofillFillValueSchema.js"

/** Fills classified controls in the focused form/root with native setters and page-observable events. */
export function extensionAutofillControlsFill(
  fields: ReadonlyMap<string, HTMLElement>,
  fieldKinds: ReadonlyMap<string, ExtensionAutofillFieldKind>,
  focusedFieldId: string,
  values: readonly ExtensionAutofillFillValue[],
): number {
  const focused = fields.get(focusedFieldId)
  if (focused === undefined || !focused.isConnected) return 0
  const form = focused.closest("form")
  const root = focused.getRootNode()
  const valuesByKind = new Map(values.map((value) => [value.kind, value.value]))
  let filledCount = 0

  for (const [fieldId, control] of fields) {
    if (!control.isConnected || (form === null ? control.getRootNode() !== root : control.closest("form") !== form))
      continue
    const kind = fieldKinds.get(fieldId)
    if (kind === undefined) continue
    const value = valuesByKind.get(kind)
    if (value === undefined) continue
    if (extensionAutofillControlValueSet(control, extensionAutofillControlValueAdapt(control, kind, value))) {
      filledCount += 1
    }
  }
  return filledCount
}

function extensionAutofillControlValueSet(control: HTMLElement, value: string): boolean {
  if (extensionAutofillControlBlockedCheck(control)) return false
  try {
    if (control instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      if (setter === undefined) return false
      setter.call(control, value)
    } else if (control instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
      if (setter === undefined) return false
      setter.call(control, value)
    } else if (control instanceof HTMLSelectElement) {
      const option = Array.from(control.options).find(
        (entry) =>
          entry.value.toLowerCase() === value.toLowerCase() || entry.text.trim().toLowerCase() === value.toLowerCase(),
      )
      if (option === undefined) return false
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set
      if (setter === undefined) return false
      setter.call(control, option.value)
    } else if (control.getAttribute("contenteditable") === "true") {
      control.textContent = value
    } else {
      return false
    }
    control.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
    control.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
    return true
  } catch {
    return false
  }
}

function extensionAutofillControlBlockedCheck(control: HTMLElement): boolean {
  if ("disabled" in control && control.disabled === true) return true
  if ("readOnly" in control && control.readOnly === true) return true
  if (control.hidden || control.inert || control.getAttribute("aria-disabled") === "true") return true
  return false
}

function extensionAutofillControlValueAdapt(
  control: HTMLElement,
  kind: ExtensionAutofillFieldKind,
  value: string,
): string {
  if (kind === "cardExpirationYear" && control instanceof HTMLSelectElement) {
    const hasFullYear = Array.from(control.options).some(
      (option) => option.value === value || option.text.trim() === value,
    )
    if (!hasFullYear && value.length === 4) return value.slice(-2)
  }
  if (kind === "cardExpirationDate" && control instanceof HTMLInputElement && control.type === "month") {
    const [month, year] = value.split("/")
    if (month !== undefined && year !== undefined) return `${year.length === 2 ? `20${year}` : year}-${month}`
  }
  return value
}
