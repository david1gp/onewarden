import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { ExtensionFullWindowSettingsPane } from "../../../src/extension/fullwindow/ExtensionFullWindowSettingsPane.jsx"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

test("settings exposes conservative page-load and explicit active-site controls", async () => {
  let siteToggles = 0
  let saves = 0
  const view = render(() => (
    <ExtensionFullWindowSettingsPane
      disabled={false}
      environmentSaveStatus="idle"
      errorMessage={null}
      regionSignal={createSignalObject("us")}
      regionOptions={() => ["us"]}
      regionLabel={(value) => value}
      isSelfHosted={false}
      fieldSignal={() => createSignalObject("")}
      onSave={() => {}}
      securityAvailable={true}
      securityLoading={false}
      securitySaveStatus="idle"
      securityErrorMessage={null}
      securityTimeoutSignal={createSignalObject("never")}
      securityTimeoutOptions={() => ["never"]}
      securityTimeoutLabel={(value) => value}
      securityActionSignal={createSignalObject("lock")}
      securityActionOptions={() => ["lock"]}
      securityActionLabel={(value) => value}
      securityNeverSelected={true}
      onSecuritySave={() => {}}
      autofillPageLoadSignal={createSignalObject("disabled")}
      autofillOptions={() => ["disabled", "enabled"]}
      autofillLabel={(value) => (value === "enabled" ? "On" : "Off")}
      autofillSiteAvailable={true}
      autofillSiteLabel="example.com"
      autofillSiteDisabled={false}
      autofillSaveStatus="idle"
      onAutofillSiteToggle={() => siteToggles++}
      onAutofillSave={() => saves++}
    />
  ))
  expect(view.getByText(/Cards and identities are never filled automatically/)).toBeTruthy()
  await fireEvent.click(view.getByText("Disable on this site"))
  await fireEvent.click(view.getByText("Save autofill settings"))
  expect(siteToggles).toBe(1)
  expect(saves).toBe(1)
})
