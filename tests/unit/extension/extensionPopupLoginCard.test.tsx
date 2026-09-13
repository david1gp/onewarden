import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import { ExtensionPopupLoginCard } from "../../../src/extension/popup/ExtensionPopupLoginCard.jsx"
import { fieldIconPathGet } from "../../../src/shared/field/fieldIconPathGet.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

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
