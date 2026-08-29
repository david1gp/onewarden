import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { AuthUnlockCard } from "../../../src/web/auth/ui/AuthUnlockCard.jsx"

test("AuthUnlockCard renders unlock prompt, accepts password, and triggers onSubmit", async () => {
  let submittedPassword = ""
  let biometricCalls = 0
  let logoutCalls = 0

  const screen = render(() => (
    <AuthUnlockCard
      email={() => "user@example.com"}
      onSubmit={(password) => {
        submittedPassword = password
      }}
      onBiometricUnlock={() => {
        biometricCalls += 1
      }}
      onLogout={() => {
        logoutCalls += 1
      }}
    />
  ))

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Vault is Locked")
  expect(screen.getByText("user@example.com")).toBeDefined()

  const passwordInput = screen.getByLabelText("Master Password") as HTMLInputElement
  fireEvent.input(passwordInput, { target: { value: "MySecret123!" } })

  const submitButton = screen.getByRole("button", { name: "Unlock Vault" })
  fireEvent.click(submitButton)

  expect(submittedPassword).toBe("MySecret123!")

  const biometricButton = screen.getByRole("button", { name: "Unlock with Passkey / Biometrics" })
  fireEvent.click(biometricButton)
  expect(biometricCalls).toBe(1)

  const logoutButton = screen.getByRole("button", { name: "Log Out of Account" })
  fireEvent.click(logoutButton)
  expect(logoutCalls).toBe(1)

  screen.unmount()
})

test("AuthUnlockCard respects custom headingLevel", () => {
  const screen = render(() => <AuthUnlockCard headingLevel="h2" onSubmit={() => {}} />)
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Vault is Locked")
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  screen.unmount()
})
