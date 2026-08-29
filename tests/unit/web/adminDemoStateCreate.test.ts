import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminShellStateCreate } from "../../../src/web/admin/adminShellStateCreate.js"
import { adminSettingsDemoData } from "../../../src/web/demo/adminSettingsDemoData.js"
import { adminDemoStateCreate } from "../../../src/web/demo/adminDemoStateCreate.js"

test("admin demo state filters users and switches search scope with sections", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()

    try {
      state.selectSection("users")
      state.setSearchQuery("disabled")

      expect(state.search()).toEqual({ query: "disabled", scope: "users" })
      expect(state.filteredUsers().map((user) => user.name)).toEqual(["Jamie Patel"])

      state.selectSection("organizations")

      expect(state.search()).toEqual({ query: "", scope: "organizations" })
      expect(state.filteredOrganizations().map((organization) => organization.name)).toEqual([
        "Acme Core Infrastructure",
        "Acme Design Studio",
        "Legacy Labs",
      ])
    } finally {
      dispose()
    }
  })
})

test("admin demo state tracks setting overrides and feedback lifecycle", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()

    try {
      expect(state.settings().signupsAllowed).toBe(true)
      expect(state.settings().overrides).not.toContain("signupsAllowed")

      state.toggleSetting("signupsAllowed")

      expect(state.settings().signupsAllowed).toBe(false)
      expect(state.settings().overrides).toContain("signupsAllowed")

      state.showFeedback({ kind: "success", message: "Demo feedback" })
      expect(state.feedback()).toEqual({ kind: "success", message: "Demo feedback" })

      state.clearFeedback()

      expect(state.feedback()).toBeNull()
    } finally {
      dispose()
    }
  })
})

test("admin demo reset confirmation restores defaults before showing success", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()
    const shell = adminShellStateCreate(state)

    try {
      state.toggleSetting("signupsAllowed")
      state.requestConfirmation({
        action: "resetSettings",
        entityId: null,
        title: "Reset overridden settings?",
        message: "This will restore all demo settings to their server defaults.",
      })

      shell.confirm()

      expect(state.settings()).toEqual({ ...adminSettingsDemoData, overrides: [] })
      expect(state.confirmation()).toBeNull()
      expect(state.feedback()).toEqual({
        kind: "success",
        message: "Reset overridden settings Demo state confirmed.",
      })
    } finally {
      dispose()
    }
  })
})
