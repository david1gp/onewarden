import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { AdminDemoLoginView } from "../../../src/web/admin/AdminDemoLoginView.jsx"

test("AdminDemoLoginView validates and locally accepts an interactive demo token", () => {
  const acceptedTokens: string[] = []
  const rendered = render(() => <AdminDemoLoginView onLogin={(token) => acceptedTokens.push(token)} />)

  try {
    expect(rendered.getByRole("heading", { level: 1, name: "Log in to demo administration" })).toBeDefined()
    const tokenInput = rendered.getByLabelText("Demo admin token") as HTMLInputElement
    expect(tokenInput.type).toBe("password")

    fireEvent.click(rendered.getByRole("button", { name: "Show token" }))
    expect(tokenInput.type).toBe("text")

    fireEvent.click(rendered.getByRole("button", { name: "Enter admin workspace" }))
    expect(rendered.getByRole("alert").textContent).toContain("Enter a demo admin token")
    expect(acceptedTokens).toHaveLength(0)

    fireEvent.input(tokenInput, { target: { value: " local-demo-token " } })
    fireEvent.click(rendered.getByRole("button", { name: "Enter admin workspace" }))
    expect(acceptedTokens).toEqual(["local-demo-token"])
  } finally {
    rendered.unmount()
  }
})
