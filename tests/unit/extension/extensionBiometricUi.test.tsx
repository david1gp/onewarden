import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionFullWindowCommands } from "../../../src/extension/fullwindow/ExtensionFullWindowCommands.js"
import {
  ExtensionFullWindowView,
  type ExtensionFullWindowViewProps,
} from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import type { ExtensionPopupCommands } from "../../../src/extension/popup/ExtensionPopupCommands.js"
import { ExtensionPopupView } from "../../../src/extension/popup/ExtensionPopupView.jsx"
import type { ExtensionPopupViewModel } from "../../../src/extension/popup/ExtensionPopupViewModel.js"
import { extensionPopupCommandsCreate } from "../../../src/extension/popup/extensionPopupCommandsCreate.js"
import { extensionPopupViewModelCreate } from "../../../src/extension/popup/extensionPopupViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

function fullWindowRender(
  model: Partial<ExtensionFullWindowViewModel>,
  commands: Partial<ExtensionFullWindowCommands> = {},
  options: Pick<ExtensionFullWindowViewProps, "initialState"> = {},
) {
  window.history.replaceState(null, "", "/")
  return render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate(model)}
      commands={extensionFullWindowCommandsCreate(commands)}
      {...options}
    />
  ))
}

function popupRender(model: Partial<ExtensionPopupViewModel>, commands: Partial<ExtensionPopupCommands> = {}) {
  return render(() => (
    <ExtensionPopupView
      model={extensionPopupViewModelCreate(model)}
      commands={extensionPopupCommandsCreate(commands)}
    />
  ))
}

test("extensionFullWindowView shows biometric unlock button when locked and biometric is enrolled", () => {
  let biometricUnlockCalls = 0
  let passwordUnlockValue = ""

  const root = fullWindowRender(
    {
      status: "locked",
      biometricStatus: {
        capability: { status: "available", platformAuthenticator: true, prf: true },
        enrolled: true,
      },
    },
    {
      biometricUnlock: () => {
        biometricUnlockCalls += 1
      },
      vaultUnlock: (password) => {
        passwordUnlockValue = password
      },
    },
  )

  const biometricButton = root.getByRole("button", { name: "Unlock with biometrics" })
  expect(biometricButton).toBeDefined()

  fireEvent.click(biometricButton)
  expect(biometricUnlockCalls).toBe(1)

  // Password unlock fallback remains functional
  const input = root.getByLabelText("Master password") as HTMLInputElement
  fireEvent.input(input, { target: { value: "fallback-secret" } })
  fireEvent.click(root.getByRole("button", { name: "Unlock" }))
  expect(passwordUnlockValue).toBe("fallback-secret")

  root.unmount()
})

test("extensionFullWindowView hides biometric unlock button when not enrolled or unsupported", () => {
  const root = fullWindowRender({
    status: "locked",
    biometricStatus: {
      capability: { status: "unsupported" },
      enrolled: false,
    },
  })

  expect(root.queryByRole("button", { name: "Unlock with biometrics" })).toBeNull()
  expect(root.getByLabelText("Master password")).toBeDefined()
  expect(root.getByRole("button", { name: "Unlock" })).toBeDefined()

  root.unmount()
})

test("extensionFullWindowView displays biometric unlock error while preserving password fallback", () => {
  const root = fullWindowRender({
    status: "locked",
    biometricStatus: {
      capability: { status: "available", platformAuthenticator: true, prf: true },
      enrolled: true,
    },
    errorMessage: "Biometric authentication was canceled.",
  })

  expect(root.getByRole("alert").textContent).toContain("Biometric authentication was canceled.")
  expect(root.getByRole("button", { name: "Unlock with biometrics" })).toBeDefined()
  expect(root.getByLabelText("Master password")).toBeDefined()

  root.unmount()
})

test("extensionPopupView renders biometric unlock button and password fallback when locked and enrolled", () => {
  let biometricUnlockCalls = 0
  let passwordUnlockValue = ""

  const root = popupRender(
    {
      status: "locked",
      biometricStatus: {
        capability: { status: "available", platformAuthenticator: true, prf: true },
        enrolled: true,
      },
    },
    {
      biometricUnlock: () => {
        biometricUnlockCalls += 1
      },
      vaultUnlock: (password) => {
        passwordUnlockValue = password
      },
    },
  )

  const biometricButton = root.getByRole("button", { name: "Unlock with biometrics" })
  expect(biometricButton).toBeDefined()

  fireEvent.click(biometricButton)
  expect(biometricUnlockCalls).toBe(1)

  const input = root.getByLabelText("Master password") as HTMLInputElement
  fireEvent.input(input, { target: { value: "popup-password" } })
  fireEvent.click(root.getByRole("button", { name: "Unlock" }))
  expect(passwordUnlockValue).toBe("popup-password")

  root.unmount()
})

test("extensionFullWindowSettingsPane renders unsupported capability status when biometrics unsupported", () => {
  const root = fullWindowRender(
    {
      status: "ready",
      biometricStatus: {
        capability: { status: "unsupported" },
        enrolled: false,
      },
    },
    {},
    { initialState: { pane: "settings" } },
  )

  expect(root.getByText("Biometric unlock is not supported by your browser or platform.")).toBeDefined()
  expect(root.queryByRole("button", { name: "Enable biometric unlock" })).toBeNull()

  root.unmount()
})

test("extensionFullWindowSettingsPane renders unavailable capability status when biometrics unavailable", () => {
  const root = fullWindowRender(
    {
      status: "ready",
      biometricStatus: {
        capability: { status: "unavailable" },
        enrolled: false,
      },
    },
    {},
    { initialState: { pane: "settings" } },
  )

  expect(root.getByText("Biometric authentication is unavailable on this device.")).toBeDefined()
  expect(root.queryByRole("button", { name: "Enable biometric unlock" })).toBeNull()

  root.unmount()
})

test("extensionFullWindowSettingsPane supports enrollment and revocation actions when biometrics available", () => {
  let enrollCalls = 0
  let revokeCalls = 0

  const unenrolledRoot = fullWindowRender(
    {
      status: "ready",
      biometricStatus: {
        capability: { status: "available", platformAuthenticator: true, prf: true },
        enrolled: false,
      },
    },
    {
      biometricEnroll: () => {
        enrollCalls += 1
      },
    },
    { initialState: { pane: "settings" } },
  )

  expect(unenrolledRoot.getByText("Biometric unlock is disabled")).toBeDefined()
  const enrollButton = unenrolledRoot.getByRole("button", { name: "Enable biometric unlock" })
  fireEvent.click(enrollButton)
  expect(enrollCalls).toBe(1)
  unenrolledRoot.unmount()

  const enrolledRoot = fullWindowRender(
    {
      status: "ready",
      biometricStatus: {
        capability: { status: "available", platformAuthenticator: true, prf: true },
        enrolled: true,
      },
      biometricSaveStatus: "saved",
    },
    {
      biometricRevoke: () => {
        revokeCalls += 1
      },
    },
    { initialState: { pane: "settings" } },
  )

  expect(enrolledRoot.getByText("Biometric unlock is enabled")).toBeDefined()
  expect(enrolledRoot.getByText("Biometric settings saved.")).toBeDefined()
  const revokeButton = enrolledRoot.getByRole("button", { name: "Disable biometric unlock" })
  fireEvent.click(revokeButton)
  expect(revokeCalls).toBe(1)
  enrolledRoot.unmount()
})

test("extensionFullWindowSettingsPane renders biometric error status message on failure", () => {
  const root = fullWindowRender(
    {
      status: "ready",
      biometricStatus: {
        capability: { status: "available", platformAuthenticator: true, prf: true },
        enrolled: false,
      },
      biometricSaveStatus: "error",
      biometricErrorMessage: "The user canceled the biometric enrollment request.",
    },
    {},
    { initialState: { pane: "settings" } },
  )

  expect(root.getByRole("alert").textContent).toContain("The user canceled the biometric enrollment request.")

  root.unmount()
})

test("extensionFullWindowCommandsCreate biometricEnroll and biometricRevoke send messages and update model", async () => {
  let currentModel = extensionFullWindowViewModelCreate()
  const sentMessages: unknown[] = []
  let refreshCount = 0

  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        sentMessages.push(message)
        return resultCreate({ enrolled: true })
      },
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
      onRefresh: async () => {
        refreshCount += 1
      },
    },
  )

  commands.biometricEnroll()
  expect(sentMessages).toEqual([{ type: "biometricEnroll" }])
  expect(currentModel.biometricSaveStatus).toBe("saving")
  expect(currentModel.busy).toBe(true)

  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(refreshCount).toBe(1)
  expect(currentModel.biometricSaveStatus).toBe("saved")
  expect(currentModel.busy).toBe(false)

  commands.biometricRevoke()
  expect(sentMessages).toEqual([{ type: "biometricEnroll" }, { type: "biometricRevoke" }])
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(refreshCount).toBe(2)
})

test("extensionFullWindowCommandsCreate handles biometric command errors properly", async () => {
  let currentModel = extensionFullWindowViewModelCreate()

  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async () =>
        resultErrorCreate("extensionBackgroundRouter.biometricEnroll", "Biometric operation failed."),
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
    },
  )

  commands.biometricEnroll()
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(currentModel.busy).toBe(false)
  expect(currentModel.biometricSaveStatus).toBe("error")
  expect(currentModel.biometricErrorMessage).toBe("Biometric operation failed.")
})
