import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { AuthLoginView } from "../../../src/web/auth/ui/AuthLoginView.jsx"

test("AuthLoginView renders accessible form, accepts inputs, and toggles password visibility", async () => {
  let registerNavigated = 0
  let verifyNavigated = 0

  const screen = render(() => (
    <AuthLoginView
      initialEmail="test@example.com"
      onNavigateToRegister={() => {
        registerNavigated += 1
      }}
      onNavigateToVerify={() => {
        verifyNavigated += 1
      }}
    />
  ))

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Log In to OneWarden")

  const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement
  expect(emailInput.value).toBe("test@example.com")

  const passwordInput = screen.getByLabelText("Master Password") as HTMLInputElement
  expect(passwordInput.type).toBe("password")

  const toggleButton = screen.getByLabelText("Show master password")
  fireEvent.click(toggleButton)
  expect(passwordInput.type).toBe("text")

  const rememberLabel = screen.getByText("Remember email")
  expect(rememberLabel).toBeDefined()

  const submitButton = screen.getByRole("button", { name: "Log In" })
  expect(submitButton).toBeDefined()

  expect(registerNavigated).toBe(0)
  expect(verifyNavigated).toBe(0)

  screen.unmount()
})
