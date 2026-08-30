import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { AdminDiagnosticsView } from "../../../src/web/admin/AdminDiagnosticsView.jsx"
import { adminDemoStateCreate } from "../../../src/web/demo/adminDemoStateCreate.js"

test("AdminDiagnosticsView renders the Vaultwarden diagnostic surface and support workflow", async () => {
  let copied = ""
  const state = adminDemoStateCreate({
    clipboard: {
      writeText: async (value) => {
        copied = value
      },
    },
  })
  const rendered = render(() => <AdminDiagnosticsView state={state} />)

  try {
    expect(rendered.container.textContent).toContain("Server Installed")
    expect(rendered.container.textContent).toContain("Web Latest")
    expect(rendered.container.textContent).toContain("Running within a container")
    expect(rendered.container.textContent).toContain("Browser/Server Time Check")
    expect(rendered.container.textContent).toContain("Security headers")
    expect(rendered.container.textContent).toContain("Invalid Feature Flags")
    expect(rendered.container.querySelectorAll("details")).toHaveLength(17)

    fireEvent.click(rendered.getByRole("button", { name: "Generate Support String" }))

    expect(rendered.container.textContent).toContain("current configuration")
    expect(rendered.container.textContent).toContain("Vaultwarden version: v1.34.1")

    await fireEvent.click(rendered.getByRole("button", { name: "Copy To Clipboard" }))

    expect(copied).toContain("### Config & Details")
  } finally {
    rendered.unmount()
  }
})
