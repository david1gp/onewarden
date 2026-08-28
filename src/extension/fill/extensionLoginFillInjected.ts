import type { Result } from "#result"
import type { ExtensionLoginFillData } from "./extensionLoginFillDataSchema.js"

type ExtensionLoginFillCredentials = {
  username: string | null
  password: string | null
}

/** One-shot DOM fill function serialized into the active page by chrome.scripting. */
export function extensionLoginFillInjected(credentials: ExtensionLoginFillCredentials): Result<ExtensionLoginFillData> {
  function extensionLoginFillInjectedError(message: string): Result<ExtensionLoginFillData> {
    return {
      success: false,
      op: "extensionLoginFillInjected",
      errorMessage: message,
    }
  }

  function extensionLoginFillInputVisible(input: HTMLInputElement): boolean {
    if (input.type.toLowerCase() === "hidden") return false
    if (input.hidden || input.disabled || input.readOnly || input.inert) return false
    if (input.getAttribute("aria-disabled") === "true") return false
    if (input.matches(":disabled")) return false

    let current: HTMLElement | null = input
    while (current !== null) {
      if (current.hidden || current.inert || current.getAttribute("aria-hidden") === "true") return false
      const style = window.getComputedStyle(current)
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false
      if (style.opacity === "0") return false
      current = current.parentElement
    }
    return true
  }

  function extensionLoginFillInputHintsRead(input: HTMLInputElement): string {
    const labels = input.labels === null ? [] : Array.from(input.labels, (label) => label.textContent ?? "")
    const parentLabel = input.closest("label")?.textContent ?? ""
    return [input.name, input.id, input.placeholder, input.getAttribute("aria-label"), ...labels, parentLabel]
      .filter((value): value is string => value !== null)
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
  }

  function extensionLoginFillInputAutocompleteRead(input: HTMLInputElement): string {
    const tokens = (input.getAttribute("autocomplete") ?? "").trim().toLowerCase().split(/\s+/)
    return (
      tokens.find((token) =>
        ["username", "email", "current-password", "new-password", "one-time-code"].includes(token),
      ) ??
      tokens[0] ??
      ""
    )
  }

  function extensionLoginFillUsernameScore(input: HTMLInputElement): number {
    const type = input.type.toLowerCase()
    const autocomplete = extensionLoginFillInputAutocompleteRead(input)
    if (autocomplete === "new-password" || autocomplete === "one-time-code") return -1
    const hints = extensionLoginFillInputHintsRead(input)
    const hintWords = new Set(hints.split(" ").filter((word) => word !== ""))
    let score = 0
    if (autocomplete === "username") score += 100
    if (autocomplete === "email") score += 90
    if (type === "email") score += 80
    if (hintWords.has("username")) score += 70
    if (hintWords.has("email")) score += 60
    if (hintWords.has("user")) score += 50
    if (hintWords.has("login")) score += 40
    if (hintWords.has("account") || hintWords.has("identifier")) score += 30
    return score
  }

  function extensionLoginFillUsernameInputFind(): HTMLInputElement | null {
    let selected: HTMLInputElement | null = null
    let selectedScore = 0
    for (const input of document.querySelectorAll("input")) {
      if (!(input instanceof HTMLInputElement) || !extensionLoginFillInputVisible(input)) continue
      const type = input.type.toLowerCase()
      if (type !== "text" && type !== "email") continue
      const score = extensionLoginFillUsernameScore(input)
      if (score <= selectedScore) continue
      selected = input
      selectedScore = score
    }
    return selected
  }

  function extensionLoginFillPasswordInputFind(): HTMLInputElement | null {
    for (const input of document.querySelectorAll("input")) {
      if (!(input instanceof HTMLInputElement) || !extensionLoginFillInputVisible(input)) continue
      if (input.type.toLowerCase() !== "password") continue
      const autocomplete = extensionLoginFillInputAutocompleteRead(input)
      if (autocomplete === "new-password" || autocomplete === "one-time-code") continue
      return input
    }
    return null
  }

  function extensionLoginFillInputSet(input: HTMLInputElement, value: string): boolean {
    const inputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    if (inputValueSetter === undefined) return false
    try {
      inputValueSetter.call(input, value)
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
      input.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
    } catch {
      return false
    }
    return true
  }

  if (credentials === null || typeof credentials !== "object") {
    return extensionLoginFillInjectedError("Fill credentials are invalid.")
  }
  if (credentials.username !== null && typeof credentials.username !== "string") {
    return extensionLoginFillInjectedError("Fill credentials are invalid.")
  }
  if (credentials.password !== null && typeof credentials.password !== "string") {
    return extensionLoginFillInjectedError("Fill credentials are invalid.")
  }

  const usernameInput = credentials.username === null ? null : extensionLoginFillUsernameInputFind()
  const passwordInput = credentials.password === null ? null : extensionLoginFillPasswordInputFind()
  const usernameFilled =
    credentials.username !== null &&
    usernameInput !== null &&
    extensionLoginFillInputSet(usernameInput, credentials.username)
  const passwordFilled =
    credentials.password !== null &&
    passwordInput !== null &&
    extensionLoginFillInputSet(passwordInput, credentials.password)
  const requestedCount = Number(credentials.username !== null) + Number(credentials.password !== null)
  if (requestedCount === 0) return extensionLoginFillInjectedError("No fillable credentials were provided.")

  const filledCount = Number(usernameFilled) + Number(passwordFilled)
  const status = filledCount === 0 ? "noFields" : filledCount === requestedCount ? "filled" : "partiallyFilled"
  return {
    success: true,
    data: { status, usernameFilled, passwordFilled },
  }
}
