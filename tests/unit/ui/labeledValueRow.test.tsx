import { describe, expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
import { LabeledValueRow } from "../../../src/ui/static/value/LabeledValueRow.jsx"

describe("LabeledValueRow", () => {
  test("renders label, value, and action in order", () => {
    const screen = render(() => (
      <LabeledValueRow label="Username" value="ada@example.com" action={<button type="button">Copy</button>} />
    ))

    expect(screen.container.textContent).toBe("Usernameada@example.comCopy")

    screen.unmount()
  })

  test("omits the action wrapper when no action is supplied", () => {
    const screen = render(() => <LabeledValueRow label="Username" value="ada@example.com" />)

    const row = screen.container.firstElementChild as HTMLElement
    expect(row.children.length).toBe(1)
    expect(screen.queryByRole("button")).toBeNull()

    screen.unmount()
  })

  test("renders JSX label and value content", () => {
    const screen = render(() => (
      <LabeledValueRow label={<span data-testid="label">Card Number</span>} value={<a href="/x">4242</a>} />
    ))

    expect(screen.getByTestId("label").textContent).toBe("Card Number")
    expect(screen.getByRole("link").getAttribute("href")).toBe("/x")

    screen.unmount()
  })

  test("merges caller classes onto the row, label, value, and action", () => {
    const screen = render(() => (
      <LabeledValueRow
        class="pb-0"
        labelClass="text-red-500"
        valueClass="font-mono"
        actionClass="gap-4"
        label="Label"
        value="Value"
        action={<button type="button">Copy</button>}
      />
    ))

    const row = screen.container.firstElementChild as HTMLElement
    expect(row.className).toContain("pb-0")
    expect(row.className).not.toContain("pb-2.5")
    expect((row.firstElementChild?.firstElementChild as HTMLElement).className).toContain("text-red-500")
    expect((row.firstElementChild?.lastElementChild as HTMLElement).className).toContain("font-mono")
    expect((row.lastElementChild as HTMLElement).className).toContain("gap-4")

    screen.unmount()
  })
})
