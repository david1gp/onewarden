import { afterEach, describe, expect, test } from "bun:test"
import { Window } from "happy-dom"
import { extensionAutofillFieldsDiscover } from "../../../src/extension/autofill/extensionAutofillFieldsDiscover.js"
import { extensionAutofillPageLoadCandidateSelect } from "../../../src/extension/autofill/extensionAutofillPageLoadCandidateSelect.js"

describe("task 11 page-load autofill", () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  test("defaults to no fill and rejects ambiguous or non-login candidates", () => {
    const fields = [
      { id: "u", formId: "login", kind: "username" as const, control: "input" as const },
      { id: "p", formId: "login", kind: "currentPassword" as const, control: "input" as const },
    ]
    const login = { id: "one", name: "One", subtitle: "user", type: 1 as const, permission: "allowed" as const }
    expect(
      extensionAutofillPageLoadCandidateSelect(
        { pageLoadEnabled: false, disabledSites: [] },
        "https://example.com",
        fields,
        [login],
      ),
    ).toBeNull()
    expect(
      extensionAutofillPageLoadCandidateSelect(
        { pageLoadEnabled: true, disabledSites: [] },
        "https://example.com",
        fields,
        [login, { ...login, id: "two" }],
      ),
    ).toBeNull()
    expect(
      extensionAutofillPageLoadCandidateSelect(
        { pageLoadEnabled: true, disabledSites: [] },
        "https://example.com",
        fields,
        [{ ...login, type: 3 }],
      ),
    ).toBeNull()
  })

  test("honors an explicit site disable and allows one clear login", () => {
    const fields = [
      { id: "u", formId: "login", kind: "username" as const, control: "input" as const },
      { id: "p", formId: "login", kind: "currentPassword" as const, control: "input" as const },
    ]
    const candidate = { id: "one", name: "One", subtitle: "user", type: 1 as const, permission: "allowed" as const }
    expect(
      extensionAutofillPageLoadCandidateSelect(
        { pageLoadEnabled: true, disabledSites: ["example.com"] },
        "https://www.example.com/login",
        fields,
        [candidate],
      ),
    ).toBeNull()
    expect(
      extensionAutofillPageLoadCandidateSelect(
        { pageLoadEnabled: true, disabledSites: [] },
        "https://example.com/login",
        fields,
        [candidate],
      )?.id,
    ).toBe("one")
  })

  test("discovers a login form rendered after the initial scan with one stable form id", () => {
    const page = new Window({ url: "https://example.com" })
    let sequence = 0
    const ids = new WeakMap<HTMLElement, string>()
    const resolve = (element: HTMLElement) => ids.get(element) ?? `field-${++sequence}`
    expect(extensionAutofillFieldsDiscover(page.document as unknown as Document, resolve)).toHaveLength(0)
    page.document.body.innerHTML =
      '<form id="late"><input autocomplete="username"><input type="password" autocomplete="current-password"></form>'
    const discovered = extensionAutofillFieldsDiscover(page.document as unknown as Document, resolve)
    expect(discovered.map((entry) => entry.descriptor.kind)).toEqual(["username", "currentPassword"])
    expect(new Set(discovered.map((entry) => entry.descriptor.formId)).size).toBe(1)
  })
})
