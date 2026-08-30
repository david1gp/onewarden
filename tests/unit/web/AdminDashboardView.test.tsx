import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { webAdminApiClientCreate } from "../../../src/web/admin/model/webAdminApiClientCreate.js"
import { AdminDashboardView } from "../../../src/web/admin/ui/AdminDashboardView.jsx"

test("AdminDashboardView uses the shared admin shell without losing production sections", () => {
  const apiClient = webAdminApiClientCreate({
    fetch: async () => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
  })
  const rendered = render(() => <AdminDashboardView apiClient={apiClient} onLogout={() => undefined} />)

  try {
    expect(rendered.getByRole("heading", { level: 1, name: "OneWarden Admin Panel" })).toBeDefined()
    expect(rendered.getByRole("navigation", { name: "Admin sections" })).toBeDefined()
    expect(rendered.getByRole("button", { name: "Mail & Backup" })).toBeDefined()

    const organizationsButton = rendered.getByRole("button", { name: "Organizations" })
    fireEvent.click(organizationsButton)

    expect(organizationsButton.getAttribute("aria-current")).toBe("page")
    expect(rendered.getByRole("heading", { level: 2, name: "Organizations" })).toBeDefined()
  } finally {
    rendered.unmount()
  }
})
