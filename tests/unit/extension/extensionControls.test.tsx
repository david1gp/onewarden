import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { ExtensionButtonIcon } from "../../../src/extension/ui/ExtensionButtonIcon.jsx"
import { ExtensionBadge } from "../../../src/extension/ui/ExtensionBadge.jsx"
import { ExtensionCardWrapper } from "../../../src/extension/ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../../../src/extension/ui/ExtensionCheckbox.jsx"
import { ExtensionInputS } from "../../../src/extension/ui/ExtensionInputS.jsx"
import { ExtensionSelectSingleNative } from "../../../src/extension/ui/ExtensionSelectSingleNative.jsx"
import { ExtensionSwitchSingle } from "../../../src/extension/ui/ExtensionSwitchSingle.jsx"
import { ExtensionTextareaS } from "../../../src/extension/ui/ExtensionTextareaS.jsx"
import { ExtensionSeparator } from "../../../src/extension/ui/ExtensionSeparator.jsx"
import { ExtensionSeparatorWithText } from "../../../src/extension/ui/ExtensionSeparatorWithText.jsx"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

test("extension checkbox uses one native checked and disabled control", () => {
  let changes = 0
  const root = render(() => (
    <ExtensionCheckbox id="remember" checked disabled onChange={() => (changes += 1)}>
      Remember this device
    </ExtensionCheckbox>
  ))

  const checkbox = root.getByRole("checkbox", { name: "Remember this device" }) as HTMLInputElement
  expect(checkbox.checked).toBe(true)
  expect(checkbox.disabled).toBe(true)
  expect(checkbox.classList.contains("extension-checkbox-input")).toBe(true)
  expect(root.container.querySelectorAll('[role="checkbox"]')).toHaveLength(0)
  fireEvent.click(checkbox)
  expect(changes).toBe(0)

  root.unmount()
})

test("extension text controls and native select expose native disabled state", () => {
  const inputSignal = createSignalObject("input")
  const textareaSignal = createSignalObject("textarea")
  const selectSignal = createSignalObject("first")
  const root = render(() => (
    <>
      <ExtensionInputS aria-label="Input" valueSignal={inputSignal} disabled />
      <ExtensionTextareaS aria-label="Textarea" valueSignal={textareaSignal} disabled />
      <ExtensionSelectSingleNative
        id="select"
        valueSignal={selectSignal}
        getOptions={() => ["first", "second"]}
        disabled
      />
    </>
  ))

  const input = root.getByLabelText("Input") as HTMLInputElement
  const textarea = root.getByLabelText("Textarea") as HTMLTextAreaElement
  const select = root.container.querySelector("select") as HTMLSelectElement
  expect(input.disabled).toBe(true)
  expect(textarea.disabled).toBe(true)
  expect(select.disabled).toBe(true)
  expect(input.classList.contains("extension-input-control")).toBe(true)
  expect(textarea.classList.contains("extension-textarea-control")).toBe(true)
  expect(select.classList.contains("extension-select-control")).toBe(true)

  root.unmount()
})

test("extension switch presents checked and disabled radio states", () => {
  const valueSignal = createSignalObject("lock")
  const root = render(() => (
    <ExtensionSwitchSingle
      valueSignal={valueSignal}
      getOptions={() => ["lock", "logout"]}
      valueText={(value) => (value === "lock" ? "Lock" : "Log out")}
      disabled
    />
  ))

  const group = root.getByRole("radiogroup")
  const lock = root.getByRole("radio", { name: "Lock" }) as HTMLButtonElement
  const logout = root.getByRole("radio", { name: "Log out" }) as HTMLButtonElement
  expect(group.classList.contains("extension-switch-control")).toBe(true)
  expect(lock.getAttribute("aria-checked")).toBe("true")
  expect(logout.getAttribute("aria-checked")).toBe("false")
  expect(lock.disabled).toBe(true)
  expect(logout.disabled).toBe(true)
  fireEvent.click(logout)
  expect(valueSignal.get()).toBe("lock")

  root.unmount()
})

test("extension loading icon button is natively disabled and announced unavailable", () => {
  let clicks = 0
  const root = render(() => (
    <ExtensionButtonIcon isLoading onClick={() => (clicks += 1)}>
      Copying…
    </ExtensionButtonIcon>
  ))

  const button = root.getByRole("button", { name: "Copying…" }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  expect(button.getAttribute("aria-disabled")).toBe("true")
  expect(button.classList.contains("extension-icon-control")).toBe(true)
  expect(button.querySelector("svg")?.classList.contains("animate-spin")).toBe(true)
  fireEvent.click(button)
  expect(clicks).toBe(0)

  root.unmount()
})

test("extension surface wrappers own card, badge, and separator colors", () => {
  const root = render(() => (
    <>
      <ExtensionCardWrapper aria-label="Card">Card content</ExtensionCardWrapper>
      <ExtensionBadge>Badge content</ExtensionBadge>
      <ExtensionSeparator />
      <ExtensionSeparatorWithText>Separator label</ExtensionSeparatorWithText>
    </>
  ))

  expect(root.getByLabelText("Card").classList.contains("extension-card-surface")).toBe(true)
  expect(root.getByText("Badge content").classList.contains("extension-badge")).toBe(true)
  expect(root.container.querySelector(".extension-separator")).not.toBeNull()
  expect(root.getByText("Separator label").closest(".extension-separator-with-text")).not.toBeNull()

  root.unmount()
})
