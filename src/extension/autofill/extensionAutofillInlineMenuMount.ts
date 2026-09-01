type InlineMenuMountOptions = {
  document: Document
  field: HTMLElement
  fieldId: string
  onDismiss: (reason: "blur" | "escape" | "navigation" | "removed" | "stopped") => void
}

type InlineMenuDismissReason = Parameters<InlineMenuMountOptions["onDismiss"]>[0]

/** Mounts an isolated, field-adjacent menu shell without receiving or retaining vault data. */
export function extensionAutofillInlineMenuMount(options: InlineMenuMountOptions): {
  dismiss: (reason: InlineMenuDismissReason) => void
  hostConnected: () => boolean
} {
  const host = options.document.createElement("div")
  host.dataset.onewardenAutofill = "menu"
  host.setAttribute("aria-hidden", "false")
  for (const [property, value] of Object.entries({
    all: "initial",
    display: "block",
    position: "fixed",
    inset: "0 auto auto 0",
    width: "0",
    height: "0",
    "z-index": "2147483647",
    "pointer-events": "none",
    "color-scheme": "light dark",
  })) {
    host.style.setProperty(property, value, "important")
  }

  const shadow = host.attachShadow({ mode: "closed" })
  const style = options.document.createElement("style")
  style.textContent = `
    :host { all: initial !important; }
    *, *::before, *::after { box-sizing: border-box; }
    button { all: unset; align-items: center; background: #175ddc; border: 2px solid #fff; border-radius: 999px;
      box-shadow: 0 2px 8px rgb(0 0 0 / .35); color: #fff; cursor: pointer; display: flex; font: 700 14px/1 system-ui;
      height: 28px; justify-content: center; pointer-events: auto; position: fixed; width: 28px; z-index: 2147483647; }
    button:focus-visible { outline: 3px solid #ffbf47; outline-offset: 2px; }
    [role="dialog"] { background: Canvas; border: 1px solid GrayText; border-radius: 8px; box-shadow: 0 6px 24px rgb(0 0 0 / .3);
      color: CanvasText; font: 13px/1.4 system-ui; max-width: 260px; padding: 12px; pointer-events: auto; position: fixed;
      z-index: 2147483647; }
    [hidden] { display: none !important; }
  `
  const button = options.document.createElement("button")
  button.type = "button"
  button.setAttribute("aria-label", "Open OneWarden autofill menu")
  button.setAttribute("aria-haspopup", "dialog")
  button.setAttribute("aria-expanded", "false")
  button.textContent = "1W"
  const dialog = options.document.createElement("div")
  dialog.id = `onewarden-inline-${options.fieldId.replace(/[^a-zA-Z0-9_-]/g, "")}`
  dialog.setAttribute("role", "dialog")
  dialog.setAttribute("aria-label", "OneWarden autofill")
  dialog.tabIndex = -1
  dialog.hidden = true
  dialog.textContent = "Autofill choices are not available in this foundation build."
  button.setAttribute("aria-controls", dialog.id)
  shadow.append(style, button, dialog)

  let disposed = false
  const positionUpdate = (): void => {
    if (!options.field.isConnected) {
      dispose("removed")
      return
    }
    const rect = options.field.getBoundingClientRect()
    const top = Math.max(4, Math.min(globalThis.innerHeight - 32, rect.top + (rect.height - 28) / 2))
    const left = Math.max(4, Math.min(globalThis.innerWidth - 32, rect.right - 32))
    button.style.top = `${top}px`
    button.style.left = `${left}px`
    dialog.style.top = `${Math.min(globalThis.innerHeight - 80, top + 34)}px`
    dialog.style.left = `${Math.max(4, Math.min(globalThis.innerWidth - 264, left - 228))}px`
  }
  const dialogClose = (returnFocus: boolean): void => {
    if (dialog.hidden) return
    dialog.hidden = true
    button.setAttribute("aria-expanded", "false")
    if (returnFocus && options.field.isConnected) options.field.focus({ preventScroll: true })
  }
  const keydownHandle = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return
    if (dialog.hidden) {
      dispose("escape")
      return
    }
    event.preventDefault()
    event.stopPropagation()
    dialogClose(true)
    dispose("escape")
  }
  const pointerHandle = (event: PointerEvent): void => {
    if (event.composedPath().includes(host) || (event.target instanceof Node && options.field.contains(event.target)))
      return
    dialogClose(false)
  }
  const dispose = (reason: InlineMenuDismissReason): void => {
    if (disposed) return
    disposed = true
    globalThis.removeEventListener("resize", positionUpdate)
    globalThis.removeEventListener("scroll", positionUpdate, true)
    options.document.removeEventListener("keydown", keydownHandle, true)
    options.document.removeEventListener("pointerdown", pointerHandle, true)
    host.remove()
    options.onDismiss(reason)
  }

  button.addEventListener("click", () => {
    const opening = dialog.hidden
    dialog.hidden = !opening
    button.setAttribute("aria-expanded", String(opening))
    if (opening) dialog.focus({ preventScroll: true })
  })
  options.document.addEventListener("keydown", keydownHandle, true)
  options.document.addEventListener("pointerdown", pointerHandle, true)
  globalThis.addEventListener("resize", positionUpdate)
  globalThis.addEventListener("scroll", positionUpdate, true)
  ;(options.document.body ?? options.document.documentElement).append(host)
  positionUpdate()

  return { dismiss: dispose, hostConnected: () => host.isConnected }
}
