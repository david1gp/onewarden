import { expect, test } from "bun:test"
import { demoSettingsSectionResolve } from "../../../src/web/demo/demoSettingsSectionResolve.js"

const demoSettingsSectionAliases = [
  { path: "/demo/settings", section: "profile" },
  { path: "/demo/settings/account", section: "profile" },
  { path: "/demo/settings/profile", section: "profile" },
  { path: "/demo/settings/security", section: "security" },
  { path: "/demo/settings/two-factor", section: "security" },
  { path: "/demo/settings/2fa", section: "security" },
  { path: "/demo/settings/two-factor-setup", section: "security" },
  { path: "/demo/settings/email", section: "email" },
  { path: "/demo/settings/devices", section: "devices" },
  { path: "/demo/settings/sessions", section: "devices" },
  { path: "/demo/settings/emergency", section: "emergency" },
  { path: "/demo/settings/tools", section: "tools" },
  { path: "/demo/settings/import", section: "tools" },
  { path: "/demo/settings/export", section: "tools" },
  { path: "/demo/settings/appearance", section: "appearance" },
  { path: "/demo/settings/theme", section: "appearance" },
  { path: "/demo/settings/danger", section: "danger" },
  { path: "/demo/settings/delete-account", section: "danger" },
] as const

test("demo settings routes resolve supported aliases to their sections", () => {
  for (const alias of demoSettingsSectionAliases) {
    expect(demoSettingsSectionResolve(alias.path)).toBe(alias.section)
    expect(demoSettingsSectionResolve(`${alias.path}/`)).toBe(alias.section)
    expect(demoSettingsSectionResolve(alias.path.toUpperCase())).toBe(alias.section)
  }

  expect(demoSettingsSectionResolve("/demo/settings/unknown")).toBe("profile")
})
