import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiFormTextboxPassword } from "@adaptive-ds/mdi/mdiFormTextboxPassword.js"
import { mdiIdentifier } from "@adaptive-ds/mdi/mdiIdentifier.js"
import { mdiKeyVariant } from "@adaptive-ds/mdi/mdiKeyVariant.js"
import { mdiTextBoxOutline } from "@adaptive-ds/mdi/mdiTextBoxOutline.js"
import { mdiTwoFactorAuthentication } from "@adaptive-ds/mdi/mdiTwoFactorAuthentication.js"
import { mdiWeb } from "@adaptive-ds/mdi/mdiWeb.js"
import { expect, test } from "bun:test"
import { fieldIconPathGet } from "../../../src/shared/field/fieldIconPathGet.js"

test("fieldIconPathGet resolves shared semantic vault field icons", () => {
  expect(fieldIconPathGet("Username")).toBe(mdiAccountOutline)
  expect(fieldIconPathGet("Password")).toBe(mdiFormTextboxPassword)
  expect(fieldIconPathGet("Website")).toBe(mdiWeb)
  expect(fieldIconPathGet("URI 1")).toBe(mdiWeb)
  expect(fieldIconPathGet("Account number")).toBe(mdiIdentifier)
  expect(fieldIconPathGet("Recovery phrase")).toBe(mdiKeyVariant)
  expect(fieldIconPathGet("TOTP code")).toBe(mdiTwoFactorAuthentication)
  expect(fieldIconPathGet("Other field")).toBe(mdiTextBoxOutline)
})
