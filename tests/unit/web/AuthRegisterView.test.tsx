import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { AuthRegisterView } from "../../../src/web/auth/ui/AuthRegisterView.jsx"

test("AuthRegisterView renders registration fields and validates matching passwords", async () => {
  let loginNavigated = 0

  const screen = render(() => (
    <AuthRegisterView
      onNavigateToLogin={() => {
        loginNavigated += 1
      }}
    />
  ))

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Create an Account")

  const emailInput = screen.getByLabelText("Email Address *") as HTMLInputElement
  const passwordInput = screen.getByLabelText("Master Password *") as HTMLInputElement
  const confirmInput = screen.getByLabelText("Confirm Master Password *") as HTMLInputElement

  fireEvent.input(emailInput, { target: { value: "alice@example.com" } })
  fireEvent.input(passwordInput, { target: { value: "password123" } })
  fireEvent.input(confirmInput, { target: { value: "mismatch456" } })

  const submitButton = screen.getByRole("button", { name: "Create Account" })
  fireEvent.click(submitButton)

  const alert = screen.getByRole("alert")
  expect(alert.textContent).toBe("Master passwords do not match.")
  expect(loginNavigated).toBe(0)

  screen.unmount()
})
