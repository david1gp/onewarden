import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { adminDashboardViewStateCreate } from "../../../src/web/admin/ui/adminDashboardViewStateCreate.js"
import { cipherDialogStateCreate } from "../../../src/web/ciphers/ui/cipherDialogStateCreate.js"
import { organizationWorkspaceStateCreate } from "../../../src/web/organizations/ui/organizationWorkspaceStateCreate.js"
import { settingsViewStateCreate } from "../../../src/web/settings/ui/settingsViewStateCreate.js"
import { vaultUrlStateSync } from "../../../src/web/vault/model/vaultUrlStateSync.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"

window.happyDOM.setURL("http://localhost/")

describe("router-backed URL state synchronization", () => {
  test("cipher dialog delegates replace navigation and preserves query and hash", async () => {
    const openSignal = createSignalObject(true)
    const replaced: string[] = []
    let dispose: (() => void) | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      cipherDialogStateCreate({
        hash: () => "#details",
        mode: () => "view",
        navigateReplace: (path) => replaced.push(path),
        openSignal,
        pathname: () => "/ciphers",
        search: () => "?keep=1",
        syncUrl: true,
      })
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(replaced).toEqual(["/ciphers?keep=1&dialog=cipher#details"])
    dispose?.()
  })

  test("settings and admin state follow router location inputs and replace through callbacks", async () => {
    const settingsSearch = createSignalObject("?tab=security")
    const adminSearch = createSignalObject("?tab=organizations")
    const settingsReplaced: string[] = []
    const adminReplaced: string[] = []
    let settings!: ReturnType<typeof settingsViewStateCreate>
    let admin!: ReturnType<typeof adminDashboardViewStateCreate>
    let dispose!: () => void

    createRoot((rootDispose) => {
      dispose = rootDispose
      settings = settingsViewStateCreate({
        hash: () => "#settings",
        navigateReplace: (path) => settingsReplaced.push(path),
        pathname: () => "/settings",
        search: settingsSearch.get,
        session: {} as ReturnType<typeof webAuthSessionCreate>,
      })
      admin = adminDashboardViewStateCreate({
        hash: () => "#admin",
        navigateReplace: (path) => adminReplaced.push(path),
        pathname: () => "/admin-ui",
        search: adminSearch.get,
        onLogout: () => undefined,
      })

      expect(settings.currentTab()).toBe("security")
      expect(admin.currentTab()).toBe("organizations")

      settings.setTab("email")
      admin.setCurrentTab("tools")
      expect(settingsReplaced).toEqual(["/settings?tab=email#settings"])
      expect(adminReplaced).toEqual(["/admin-ui?tab=tools#admin"])

      settingsSearch.set("?tab=devices")
      adminSearch.set("?tab=diagnostics")
    })

    await Promise.resolve()
    expect(settings.currentTab()).toBe("devices")
    expect(admin.currentTab()).toBe("diagnostics")
    dispose()
  })

  test("organization state follows router location inputs and preserves replace URL values", async () => {
    const search = createSignalObject("?tab=members&keep=1")
    const replaced: string[] = []
    let state!: ReturnType<typeof organizationWorkspaceStateCreate>
    let dispose!: () => void

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizationWorkspaceStateCreate({
        apiClientOptions: {
          fetchFn: async () => Response.json({ profile: null }),
        },
        hash: () => "#organization",
        navigateReplace: (path) => replaced.push(path),
        pathname: () => "/organizations",
        search: search.get,
      })

      expect(state.activeTab()).toBe("members")
      search.set("?tab=collections&keep=1")
    })

    await Promise.resolve()
    expect(state.activeTab()).toBe("collections")
    state.handleSelectTab("groups")
    expect(replaced).toEqual([
      "/organizations?tab=groups&keep=1&orgId=org-acme-corp-001&groupId=grp-engineering-001#organization",
    ])
    dispose()
  })

  test("vault URL synchronization delegates debounced replace navigation", async () => {
    const replaced: string[] = []
    const originalRequestIdleCallback = window.requestIdleCallback
    const idleCallback = (callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 50 })
      return 0
    }
    window.requestIdleCallback = idleCallback
    globalThis.requestIdleCallback = idleCallback

    try {
      vaultUrlStateSync(
        {
          category: "login",
          collection: null,
          folder: null,
          includeDeleted: false,
          search: "hello",
          selectedItemId: "item-1",
          vault: "personal",
        },
        {
          hash: () => "#vault",
          navigateReplace: (path) => replaced.push(path),
          pathname: () => "/",
          search: () => "?keep=1",
        },
      )

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(replaced).toEqual(["/?keep=1&vault=personal&category=login&q=hello&item=item-1#vault"])
    } finally {
      window.requestIdleCallback = originalRequestIdleCallback
      globalThis.requestIdleCallback = originalRequestIdleCallback
    }
  })
})
