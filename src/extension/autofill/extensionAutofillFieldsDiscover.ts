import { extensionAutofillFieldClassify } from "./extensionAutofillFieldClassify.js"
import type { ExtensionAutofillFieldDescriptor } from "./extensionAutofillFieldDescriptorSchema.js"

type AutofillControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement

/** Discovers safe ordinary-autofill controls through the document and every reachable open shadow root. */
export function extensionAutofillFieldsDiscover(
  documentValue: Document,
  fieldIdResolve: (control: HTMLElement) => string,
): Array<{ descriptor: ExtensionAutofillFieldDescriptor; control: HTMLElement }> {
  const discovered: Array<{ descriptor: ExtensionAutofillFieldDescriptor; control: HTMLElement }> = []
  const roots: Array<Document | ShadowRoot> = [documentValue]
  const visited = new Set<Document | ShadowRoot>()

  while (roots.length > 0) {
    const root = roots.shift()
    if (root === undefined || visited.has(root)) continue
    visited.add(root)
    for (const element of root.querySelectorAll<HTMLElement>("*")) {
      if (element.shadowRoot !== null) roots.push(element.shadowRoot)
      if (!extensionAutofillControlCheck(element) || !extensionAutofillControlUsableCheck(element)) continue
      discovered.push({
        descriptor: {
          id: fieldIdResolve(element),
          kind: extensionAutofillFieldClassify(element),
          control: extensionAutofillControlTypeResolve(element),
        },
        control: element,
      })
    }
  }
  return discovered
}

function extensionAutofillControlCheck(element: HTMLElement): element is AutofillControl {
  if (element instanceof HTMLInputElement) {
    return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(
      element.type,
    )
  }
  return (
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    (element.getAttribute("contenteditable") === "true" &&
      element.getAttribute("role") === "textbox" &&
      element.hasAttribute("autocomplete"))
  )
}

function extensionAutofillControlUsableCheck(element: AutofillControl): boolean {
  if ("disabled" in element && element.disabled) return false
  if ("readOnly" in element && element.readOnly) return false
  let current: HTMLElement | null = element
  while (current !== null) {
    if (current.hasAttribute("inert") || current.getAttribute("aria-hidden") === "true") return false
    const style = current.ownerDocument.defaultView?.getComputedStyle(current)
    if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") return false
    current = extensionAutofillComposedParentResolve(current)
  }
  return true
}

function extensionAutofillComposedParentResolve(element: HTMLElement): HTMLElement | null {
  if (element.parentElement !== null) return element.parentElement
  const root = element.getRootNode()
  return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null
}

function extensionAutofillControlTypeResolve(element: AutofillControl): ExtensionAutofillFieldDescriptor["control"] {
  if (element instanceof HTMLInputElement) return "input"
  if (element instanceof HTMLSelectElement) return "select"
  if (element instanceof HTMLTextAreaElement) return "textarea"
  return "contenteditable"
}
