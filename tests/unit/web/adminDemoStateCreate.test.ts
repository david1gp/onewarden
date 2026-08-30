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

test("admin demo confirms user actions and updates user state", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()
    const shell = adminShellStateCreate(state)

    try {
      state.selectUser("user-alex-rivera")
      state.openDialog({ kind: "userDetails", entityId: "user-alex-rivera" })
      shell.remove2fa()

      expect(state.confirmation()).toMatchObject({ action: "remove2fa", entityId: "user-alex-rivera" })
      shell.confirm()
      expect(state.users().find((user) => user.id === "user-alex-rivera")?.twoFactorEnabled).toBe(false)

      state.userDeauthorizeSessions("user-alex-rivera")
      state.userRemoveSsoAssociation("user-alex-rivera")
      const alex = state.users().find((user) => user.id === "user-alex-rivera")
      expect(alex?.sessionsDeauthorizedAt).toEqual(expect.any(String))
      expect(alex?.ssoIdentifier).toBeNull()

      state.userSetStatus("user-jamie-patel", "active")
      state.userResendInvitation("user-taylor-nguyen")
      state.usersReload()
      state.clientsForceResync()
      expect(state.users().find((user) => user.id === "user-jamie-patel")?.status).toBe("active")
      expect(state.users().find((user) => user.id === "user-taylor-nguyen")?.invitationSentAt).toEqual(
        expect.any(String),
      )
      expect(state.lastUsersReloadedAt()).toEqual(expect.any(String))
      expect(state.lastClientResyncAt()).toEqual(expect.any(String))
    } finally {
      dispose()
    }
  })
})

test("admin demo edits organization membership roles through the role dialog", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()
    const shell = adminShellStateCreate(state)

    try {
      state.openUserOrganizationRole("user-alex-rivera", "organization-acme-core")

      expect(state.dialog()).toEqual({ kind: "organizationRole", entityId: "organization-acme-core" })
      expect(state.selectedUserOrganization()?.role).toBe("owner")

      state.organizationRole.set("manager")
      shell.saveOrganizationRole({ preventDefault: () => undefined } as SubmitEvent)

      expect(state.dialog()).toBeNull()
      expect(
        state
          .users()
          .find((user) => user.id === "user-alex-rivera")
          ?.organizations?.find((organization) => organization.id === "organization-acme-core")?.role,
      ).toBe("manager")
      expect(state.feedback()?.message).toBe("Updated alex.rivera@acme.internal's role in Acme Core Infrastructure.")
    } finally {
      dispose()
    }
  })
})

test("admin demo reloads and updates organization administration state", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()
    const shell = adminShellStateCreate(state)

    try {
      const organization = state.organizations().find((item) => item.id === "organization-acme-core")
      expect(organization).toMatchObject({
        billingEmail: "billing@acme.internal",
        memberCount: 24,
        cipherCount: 148,
        attachmentCount: 12,
        collectionCount: 9,
        groupCount: 4,
        eventCount: 312,
      })
      expect(organization?.uuid).toMatch(/^[0-9a-f-]{36}$/)

      state.selectOrganization("organization-acme-core")
      state.openDialog({ kind: "organizationDetails", entityId: "organization-acme-core" })
      shell.toggleOrganizationStatus()
      shell.confirm()
      expect(state.selectedOrganization()?.status).toBe("disabled")

      state.openDialog({ kind: "organizationDetails", entityId: "organization-acme-core" })
      shell.toggleOrganizationStatus()
      shell.confirm()
      expect(state.selectedOrganization()?.status).toBe("active")

      state.organizationsReload()
      expect(state.lastOrganizationsReloadedAt()).toEqual(expect.any(String))
      expect(state.organizations()).toHaveLength(3)
    } finally {
      dispose()
    }
  })
})

test("admin demo requires an exact organization UUID before destructive deletion", () => {
  createRoot((dispose) => {
    const state = adminDemoStateCreate()
    const shell = adminShellStateCreate(state)

    try {
      const organization = state.organizations().find((item) => item.id === "organization-acme-design")
      expect(organization).toBeDefined()
      if (!organization) return

      state.selectOrganization(organization.id)
      state.openDialog({ kind: "organizationDetails", entityId: organization.id })
      shell.deleteOrganization()

      expect(state.confirmation()).toMatchObject({
        action: "deleteOrganization",
        entityId: organization.id,
        requiredInput: organization.uuid,
      })
      state.setConfirmationInput(`${organization.uuid} `)
      shell.confirm()
      expect(state.organizations()).toHaveLength(3)
      expect(state.confirmation()).not.toBeNull()
      expect(state.feedback()).toEqual({ kind: "error", message: "The organization UUID does not match." })

      state.setConfirmationInput(organization.uuid)
      shell.confirm()
      expect(state.organizations().some((item) => item.id === organization.id)).toBe(false)
      expect(state.selectedOrganization()).toBeNull()
      expect(state.dialog()).toBeNull()
      expect(state.users().find((user) => user.id === "user-alex-rivera")?.organizationCount).toBe(1)
    } finally {
      dispose()
    }
  })
})
