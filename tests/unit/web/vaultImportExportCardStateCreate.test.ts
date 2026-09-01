import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import type { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"
import { vaultImportExportCardStateCreate } from "../../../src/web/settings/ui/vaultImportExportCardStateCreate.js"

const sessionStubCreate = () =>
  ({
    getUserKey: () => null,
    session: () => ({ accessToken: "token" }),
  }) as unknown as ReturnType<typeof webAuthSessionCreate>

const organizationApiClientStubCreate = (errorMessage: string) =>
  ({
    organizationList: async () => resultErrorCreate("organizationList", errorMessage),
  }) as unknown as ReturnType<typeof organizationApiClientCreate>

test("organization loading failures only show in the active sub tab", async () => {
  const notified: string[] = []
  await createRoot(async (dispose) => {
    const state = vaultImportExportCardStateCreate({
      organizationApiClient: organizationApiClientStubCreate("Organizations unavailable."),
      onNotifyError: (message) => notified.push(message),
      session: sessionStubCreate(),
    })

    state.setImportScope("organization")
    await state.organizationsLoad()

    expect(state.importValidationMessage()).toBe("Organizations unavailable.")
    expect(state.exportValidationMessage()).toBeNull()

    state.setSubTab("export")
    state.setExportScope("organization")
    await state.organizationsLoad()

    expect(state.exportValidationMessage()).toBe("Organizations unavailable.")
    expect(state.importValidationMessage()).toBeNull()
    expect(notified).toEqual(["Organizations unavailable.", "Organizations unavailable."])

    dispose()
  })
})
