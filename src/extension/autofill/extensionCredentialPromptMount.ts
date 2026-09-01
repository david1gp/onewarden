import type { ExtensionCredentialCapturePrompt } from "./extensionCredentialCapturePromptSchema.js"

type PromptDecision = "accept" | "dismiss" | "neverSite"

/** Mounts a closed, secret-free and keyboard-accessible capture notification. */
export function extensionCredentialPromptMount(options: {
  document: Document
  prompt: ExtensionCredentialCapturePrompt
  onDecision: (decision: PromptDecision) => void
}): {
  dismiss: () => void
  statusRender: (status: "saving" | "saved" | "updated" | "unavailable") => void
  hostConnected: () => boolean
} {
  const host = options.document.createElement("div")
  host.dataset.onewardenAutofill = "credential-prompt"
  host.style.setProperty("all", "initial", "important")
  host.style.setProperty("position", "fixed", "important")
  host.style.setProperty("inset", "16px 16px auto auto", "important")
  host.style.setProperty("z-index", "2147483647", "important")
  host.style.setProperty("color-scheme", "light dark", "important")
  const shadow = host.attachShadow({ mode: "closed" })
  const style = options.document.createElement("style")
  style.textContent = `
    :host { all: initial !important; }
    *, *::before, *::after { box-sizing: border-box; }
    [role="dialog"] { background: Canvas; border: 1px solid GrayText; border-radius: 10px; box-shadow: 0 8px 28px rgb(0 0 0 / .35);
      color: CanvasText; font: 14px/1.45 system-ui; max-width: min(360px, calc(100vw - 32px)); padding: 16px; width: 340px; }
    h2 { font-size: 16px; margin: 0 0 6px; }
    p { margin: 0 0 14px; overflow-wrap: anywhere; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button { background: ButtonFace; border: 1px solid ButtonBorder; border-radius: 6px; color: ButtonText; cursor: pointer;
      font: 600 13px/1 system-ui; padding: 9px 11px; }
    button.primary { background: #175ddc; border-color: #175ddc; color: #fff; }
    button:focus-visible { outline: 3px solid #ffbf47; outline-offset: 2px; }
    button[disabled] { cursor: wait; opacity: .65; }
  `
  const dialog = options.document.createElement("section")
  dialog.setAttribute("role", "dialog")
  dialog.setAttribute("aria-live", "polite")
  dialog.setAttribute("aria-labelledby", "onewarden-capture-title")
  dialog.setAttribute("aria-describedby", "onewarden-capture-message")
  const title = options.document.createElement("h2")
  title.id = "onewarden-capture-title"
  const message = options.document.createElement("p")
  message.id = "onewarden-capture-message"
  const actions = options.document.createElement("div")
  actions.className = "actions"
  const buttons: HTMLButtonElement[] = []
  let disposed = false

  const decisionSend = (decision: PromptDecision): void => {
    if (disposed) return
    options.onDecision(decision)
    if (decision !== "accept") dispose()
  }
  const buttonAppend = (label: string, decision: PromptDecision, primary = false): void => {
    const button = options.document.createElement("button")
    button.type = "button"
    button.textContent = label
    if (primary) button.className = "primary"
    button.addEventListener("click", () => decisionSend(decision))
    buttons.push(button)
    actions.append(button)
  }
  if (options.prompt.kind === "add") {
    title.textContent = "Save login?"
    message.textContent = `Add this login for ${options.prompt.site} to OneWarden.`
    buttonAppend("Add login", "accept", true)
  } else if (options.prompt.kind === "change") {
    title.textContent = "Update login?"
    message.textContent = `Change the saved login for ${options.prompt.site}.`
    buttonAppend("Change login", "accept", true)
  } else {
    title.textContent = "Login not saved"
    const risks = {
      insecure: "This page is not using a secure HTTPS connection.",
      crossOrigin: "This form sends credentials to a different site.",
      readOnly: "The matching login is read-only.",
      ambiguous: "More than one saved login could match these credentials.",
    }
    message.textContent =
      options.prompt.risk === null ? "OneWarden could not safely save this login." : risks[options.prompt.risk]
  }
  buttonAppend("Not now", "dismiss")
  buttonAppend("Never for this site", "neverSite")
  dialog.append(title, message, actions)
  shadow.append(style, dialog)

  const keydownHandle = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return
    decisionSend("dismiss")
  }
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    options.document.removeEventListener("keydown", keydownHandle, true)
    host.remove()
  }
  options.document.addEventListener("keydown", keydownHandle, true)
  ;(options.document.body ?? options.document.documentElement).append(host)

  return {
    dismiss: dispose,
    hostConnected: () => host.isConnected,
    statusRender: (status) => {
      const labels = {
        saving: "Saving securely…",
        saved: "Login added to OneWarden.",
        updated: "Saved login changed.",
        unavailable: "OneWarden could not save this login.",
      }
      title.textContent = status === "saved" || status === "updated" ? "Done" : "OneWarden"
      message.textContent = labels[status]
      for (const button of buttons) button.disabled = status === "saving"
      if (status !== "saving") actions.replaceChildren(...buttons.filter((button) => button.textContent === "Not now"))
    },
  }
}
