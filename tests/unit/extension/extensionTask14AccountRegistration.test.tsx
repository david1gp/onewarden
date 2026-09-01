import { expect, test } from "bun:test"
import { fireEvent, render, waitFor } from "@solidjs/testing-library"
import * as v from "valibot"
import { extensionBitwardenApiClientCreate } from "../../../src/extension/api/extensionBitwardenApiClientCreate.js"
import { extensionEnvironmentResolve } from "../../../src/extension/api/extensionEnvironmentResolve.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { extensionRuntimeMessageSchema } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const environmentResult = extensionEnvironmentResolve("https://vault.example")
if (!environmentResult.success) throw new Error("Test environment is invalid.")

test("task14 account API uses existing identity and API contracts", async () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith("/accounts/register")) return Response.json({ object: "register" })
      if (url.endsWith("/send-verification-email")) return new Response(null, { status: 204 })
      if (url.endsWith("/verify-email-token")) return new Response(null, { status: 200 })
      return Response.json({ object: "set-password" })
    },
  })

  const register = await client.accountRegister({
    email: " User@Example.com ",
    masterPasswordHash: "password-hash",
    userSymmetricKey: "wrapped-key",
    keys: { encryptedPrivateKey: "private-key", publicKey: "public-key" },
  })
  const resend = await client.accountVerificationEmailSend({ email: "user@example.com" })
  const verify = await client.accountVerify({ userId: "user-id", token: "verification-token" })
  const setup = await client.accountPasswordSetup({
    accessToken: "setup-access-token",
    masterPasswordHash: "password-hash",
    userSymmetricKey: "wrapped-key",
    kdf: 0,
    kdfIterations: 600_000,
    keys: { encryptedPrivateKey: "private-key", publicKey: "public-key" },
  })

  expect(register.success).toBe(true)
  expect(resend.success).toBe(true)
  expect(verify.success).toBe(true)
  expect(setup.success).toBe(true)
  expect(calls.map((call) => call.url)).toEqual([
    "https://vault.example/identity/accounts/register",
    "https://vault.example/identity/accounts/register/send-verification-email",
    "https://vault.example/api/accounts/verify-email-token",
    "https://vault.example/api/accounts/set-password",
  ])
  expect(calls[3]?.init?.headers).toEqual({
    accept: "application/json",
    authorization: "Bearer setup-access-token",
    "content-type": "application/json",
  })
  expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
    email: "user@example.com",
    key: "wrapped-key",
    masterPasswordHash: "password-hash",
  })
})

test("task14 runtime contracts reject plaintext flows that do not pass validation", () => {
  expect(
    v.safeParse(extensionRuntimeMessageSchema, {
      type: "accountRegister",
      request: { email: "not-an-email", masterPassword: "short" },
    }).success,
  ).toBe(false)
  expect(
    v.safeParse(extensionRuntimeMessageSchema, {
      type: "accountVerify",
      request: { userId: "user-id", token: "token" },
    }).success,
  ).toBe(true)
})

test("task14 full-window logged-out registration validates and transitions to verification", async () => {
  window.history.replaceState(null, "", "/")
  const requests: { email: string; masterPassword: string }[] = []
  const commands = extensionFullWindowCommandsCreate({
    accountRegister: async (request) => {
      requests.push({ email: request.email, masterPassword: request.masterPassword })
      return resultCreate(undefined)
    },
  })
  const root = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "loggedOut" })}
      commands={commands}
      initialState={{ pane: "auth" }}
    />
  ))

  fireEvent.input(root.getByLabelText("Email address"), { target: { value: "new@example.com" } })
  fireEvent.input(root.getByLabelText("Master password"), { target: { value: "long-password" } })
  fireEvent.input(root.getByLabelText("Confirm master password"), { target: { value: "different-password" } })
  fireEvent.click(root.getAllByRole("button", { name: "Create account" }).at(-1) as HTMLButtonElement)
  expect(root.getByRole("alert").textContent).toContain("do not match")

  fireEvent.input(root.getByLabelText("Confirm master password"), { target: { value: "long-password" } })
  fireEvent.click(root.getAllByRole("button", { name: "Create account" }).at(-1) as HTMLButtonElement)

  await waitFor(() => expect(requests).toEqual([{ email: "new@example.com", masterPassword: "long-password" }]))
  expect(root.getByRole("status").textContent).toContain("Account created")
  expect(root.getByRole("button", { name: "Send verification email" })).toBeDefined()
  expect(root.queryByLabelText("Master password")).toBeNull()
  root.unmount()
})
