import { expect, test } from "bun:test"
import { extensionCredentialPromptMount } from "../../../src/extension/autofill/extensionCredentialPromptMount.js"

test("credential prompt exposes accessible add, change and at-risk actions", () => {
  const attachShadow = HTMLElement.prototype.attachShadow
  HTMLElement.prototype.attachShadow = function () {
    return attachShadow.call(this, { mode: "open" })
  }
  try {
    for (const prompt of [
      { id: "add", kind: "add" as const, site: "example.test", risk: null },
      { id: "change", kind: "change" as const, site: "example.test", risk: null },
      { id: "risk", kind: "atRisk" as const, site: "example.test", risk: "insecure" as const },
    ]) {
      const decisions: string[] = []
      const mounted = extensionCredentialPromptMount({ document, prompt, onDecision: (decision) => decisions.push(decision) })
      const host = document.querySelector("[data-onewarden-autofill='credential-prompt']") as HTMLElement
      const dialog = host.shadowRoot?.querySelector("[role='dialog']")
      expect(dialog?.getAttribute("aria-live")).toBe("polite")
      expect(dialog?.querySelector("button")?.textContent).toBe(
        prompt.kind === "add" ? "Add login" : prompt.kind === "change" ? "Change login" : "Not now",
      )
      ;(dialog?.querySelector("button") as HTMLButtonElement).click()
      expect(decisions).toEqual([prompt.kind === "atRisk" ? "dismiss" : "accept"])
      mounted.dismiss()
    }
  } finally {
    HTMLElement.prototype.attachShadow = attachShadow
    document.body.replaceChildren()
  }
})
