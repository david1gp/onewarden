import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { AdminShell } from "../../../src/web/admin/AdminShell.jsx"

test("AdminShell provides the shared titled, icon-led section composition", () => {
  const activeSection = createSignalObject<"settings" | "users">("settings")
  const rendered = render(() => (
    <AdminShell
      title="Administration"
      description="Shared shell"
      sections={[
        { id: "settings", label: "Settings", icon: "M1 1h1v1H1z" },
        { id: "users", label: "Users", icon: "M2 2h1v1H2z" },
      ]}
      activeSection={activeSection.get}
      onSelectSection={activeSection.set}
      contentIsMain
    >
      <p>{activeSection.get()}</p>
    </AdminShell>
  ))

  try {
    expect(rendered.getByRole("heading", { level: 1, name: "Administration" })).toBeDefined()
    expect(rendered.getByRole("main")).toBeDefined()
    const usersButton = rendered.getByRole("button", { name: "Users" })
    expect(usersButton.querySelector("svg")).toBeDefined()

    fireEvent.click(usersButton)

    expect(activeSection.get()).toBe("users")
    expect(usersButton.getAttribute("aria-current")).toBe("page")
  } finally {
    rendered.unmount()
  }
})
