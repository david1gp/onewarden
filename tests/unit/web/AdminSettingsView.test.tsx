import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { AdminSettingsView } from "../../../src/web/admin/AdminSettingsView.jsx"
import { adminDemoStateCreate } from "../../../src/web/demo/adminDemoStateCreate.js"

test("AdminSettingsView renders grouped controls, warnings, dependencies, and mail tools", () => {
  const state = adminDemoStateCreate()
  const rendered = render(() => <AdminSettingsView state={state} />)

  try {
    expect(rendered.container.querySelectorAll("details")).toHaveLength(8)
    expect(rendered.container.textContent).toContain("Plain-text admin token")
    expect(rendered.container.textContent).toContain("Read-only server configuration")
    expect(rendered.container.textContent).toContain("Config override")
    expect(rendered.container.textContent).toContain("SMTP Mail Test")
    expect(rendered.container.textContent).toContain("Send Test Mail")
    expect(rendered.container.textContent).toContain("Database Backup")
    expect(rendered.container.textContent).toContain("Backup Database")

    const ssoClientId = rendered.container.querySelector("#admin-setting-sso-client-id") as HTMLInputElement
    expect(ssoClientId.disabled).toBe(true)

    const adminToken = rendered.container.querySelector("#admin-setting-admin-token") as HTMLInputElement
    expect(adminToken.type).toBe("password")
    const showTokenButton = rendered.container.querySelector('button[aria-label="Show value"]') as HTMLButtonElement
    fireEvent.click(showTokenButton)
    expect(adminToken.type).toBe("text")
  } finally {
    rendered.unmount()
  }
})
