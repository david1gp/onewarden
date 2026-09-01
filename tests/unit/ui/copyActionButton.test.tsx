import { describe, expect, test } from "bun:test"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { render } from "@solidjs/testing-library"
import { CopyActionButton } from "../../../src/ui/interactive/button/CopyActionButton.jsx"

function iconPath(container: HTMLElement) {
  return container.querySelector("svg path")?.getAttribute("d")
}

describe("CopyActionButton", () => {
  test("renders the copy icon and idle labels", () => {
    const screen = render(() => <CopyActionButton label="Copy" ariaLabel="Copy password" />)

    const button = screen.getByLabelText("Copy password")
    expect(button.textContent).toBe("Copy")
    expect(iconPath(screen.container)).toBe(mdiContentCopy)

    screen.unmount()
  })

  test("renders the check icon and copied labels when copied", () => {
    const screen = render(() => (
      <CopyActionButton
        isCopied={true}
        label="Copy"
        copiedLabel="Copied"
        ariaLabel="Copy password"
        copiedAriaLabel="Copied password"
      />
    ))

    const button = screen.getByLabelText("Copied password")
    expect(button.textContent).toBe("Copied")
    expect(iconPath(screen.container)).toBe(mdiCheck)

    screen.unmount()
  })

  test("falls back to the idle labels when copied labels are omitted", () => {
    const screen = render(() => <CopyActionButton isCopied={true} label="Copy" ariaLabel="Copy password" />)

    const button = screen.getByLabelText("Copy password")
    expect(button.textContent).toBe("Copy")

    screen.unmount()
  })

  test("calls the callback once per activation", () => {
    let copyCount = 0
    const screen = render(() => <CopyActionButton ariaLabel="Copy password" onCopy={() => copyCount++} />)

    const button = screen.getByLabelText("Copy password")
    button.click()
    expect(copyCount).toBe(1)
    button.click()
    expect(copyCount).toBe(2)

    screen.unmount()
  })

  test("does not call the callback while disabled", () => {
    let copyCount = 0
    const screen = render(() => (
      <CopyActionButton disabled={true} ariaLabel="Copy password" onCopy={() => copyCount++} />
    ))

    const button = screen.getByLabelText("Copy password") as HTMLButtonElement
    expect(button.disabled).toBe(true)
    button.click()
    expect(copyCount).toBe(0)

    screen.unmount()
  })
})
