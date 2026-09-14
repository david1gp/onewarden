import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import { ExtensionPopupLoginCard } from "../../../src/extension/popup/ExtensionPopupLoginCard.jsx"
import { fieldIconPathGet } from "../../../src/shared/field/fieldIconPathGet.js"

const login: ExtensionLogin = {
  id: "login-1",
  name: "Example Mail",
  username: "ada@example.com",
  uri: "https://example.com/login",
  totpAvailable: true,
  copyableFields: [
    { key: "username", label: "Username", value: "ada@example.com" },
    { key: "password", label: "Password", value: "secret", sensitive: true },
    { key: "uri:0", label: "Website", value: "https://example.com/login" },
    { key: "custom:0", label: "Account number", value: "AC-123" },
    { key: "custom:1", label: "Recovery phrase", value: "secret phrase", sensitive: true },
  ],
}

test("ExtensionPopupLoginCard uses semantic field icons and preserves password icon on copied feedback", () => {
  const copiedFieldKey = createSignalObject<string | null>(null)
  const screen = render(() => (
    <ExtensionPopupLoginCard
      login={login}
      disabled={false}
      fillAvailable={false}
      fieldIsCopied={(field) => copiedFieldKey.get() === field.key}
      onEdit={() => {}}
      onFill={() => {}}
      onCopy={(_login, field) => copiedFieldKey.set(field.key)}
      totpIsCopied={() => false}
      onTotpCopy={() => {}}
    />
  ))

  for (const label of ["Username", "Password", "Website", "Account number", "Recovery phrase"]) {
    const button = screen.getByRole("button", { name: `Copy ${label} of Example Mail` })
    expect(button.querySelector("path")?.getAttribute("d")).toBe(fieldIconPathGet(label))
  }

  const passwordButton = screen.getByRole("button", { name: "Copy Password of Example Mail" })
  fireEvent.click(passwordButton)
  expect(passwordButton.textContent).toBe("Password copied")
  expect(passwordButton.querySelector("path")?.getAttribute("d")).toBe(fieldIconPathGet("Password"))
  expect(
    screen.getByRole("button", { name: "Copy TOTP code of Example Mail" }).querySelector("path")?.getAttribute("d"),
  ).toBe(fieldIconPathGet("TOTP code"))

  screen.unmount()
})

test("ExtensionPopupLoginCard spans its summary and lays out field actions in equal columns", () => {
  const screen = render(() => (
    <ExtensionPopupLoginCard
      login={{ ...login, name: "Northstar Mail" }}
      disabled={false}
      fillAvailable={true}
      fieldIsCopied={() => false}
      onEdit={() => {}}
      onFill={() => {}}
      onCopy={() => {}}
      totpIsCopied={() => false}
      onTotpCopy={() => {}}
    />
  ))

  const card = screen.getByLabelText("Northstar Mail")
  const summary = screen.getByRole("heading", { name: "Northstar Mail" }).parentElement?.parentElement
  const edit = screen.getByRole("button", { name: "Edit Northstar Mail" })
  const fill = screen.getByRole("button", { name: "Fill Northstar Mail" })
  const username = screen.getByRole("button", { name: "Copy Username of Northstar Mail" })
  const password = screen.getByRole("button", { name: "Copy Password of Northstar Mail" })
  const fieldGrid = username.parentElement

  expect(card.classList.contains("grid-cols-2")).toBe(true)
  expect(summary?.classList.contains("col-span-2")).toBe(true)
  expect(screen.getByRole("heading", { name: "Northstar Mail" }).classList.contains("text-base")).toBe(true)
  expect(edit.parentElement?.classList.contains("grid-cols-2")).toBe(true)
  expect(edit.parentElement).toBe(fill.parentElement)
  expect(edit.classList.contains("w-full")).toBe(true)
  expect(fill.classList.contains("w-full")).toBe(true)
  expect(fieldGrid?.classList.contains("grid-cols-2")).toBe(true)
  expect(fieldGrid?.classList.contains("col-span-2")).toBe(true)
  expect(username.classList.contains("w-full")).toBe(true)
  expect(password.classList.contains("w-full")).toBe(true)
  expect(username.classList.contains("justify-start")).toBe(true)
  expect(password.classList.contains("justify-start")).toBe(true)
  expect(username.querySelector("svg")?.classList.contains("size-6")).toBe(true)
  expect(password.querySelector("svg")?.classList.contains("size-6")).toBe(true)

  screen.unmount()
})
