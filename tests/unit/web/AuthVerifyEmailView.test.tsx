import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { AuthVerifyEmailView } from "../../../src/web/auth/ui/AuthVerifyEmailView.jsx"

test("AuthVerifyEmailView renders form and handles verification token input", async () => {
  let verifiedUserId = ""
  let verifiedToken = ""

  const fakeApiClient = {
    prelogin: async () => ({ success: true, data: {} as any }),
    login: async () => ({ success: true, data: {} as any }),
    register: async () => ({ success: true, data: { object: "register" as const } }),
    sendVerificationEmail: async () => ({ success: true, data: { token: "token-123" } }),
    verifyEmailToken: async (params: { userId: string; token: string }) => {
      verifiedUserId = params.userId
      verifiedToken = params.token
      return { success: true, data: undefined }
    },
  }

  const screen = render(() => (
    <AuthVerifyEmailView apiClient={fakeApiClient as any} initialUserId="user-abc" initialToken="tok-xyz" />
  ))

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Verify Email Address")

  const userInput = screen.getByLabelText("User ID *") as HTMLInputElement
  const tokenInput = screen.getByLabelText("Verification Token *") as HTMLInputElement

  expect(userInput.value).toBe("user-abc")
  expect(tokenInput.value).toBe("tok-xyz")

  const submitButton = screen.getByRole("button", { name: "Confirm & Verify Email" })
  fireEvent.click(submitButton)

  expect(verifiedUserId).toBe("user-abc")
  expect(verifiedToken).toBe("tok-xyz")

  screen.unmount()
})
