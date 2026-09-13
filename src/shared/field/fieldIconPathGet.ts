import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiFormTextboxPassword } from "@adaptive-ds/mdi/mdiFormTextboxPassword.js"
import { mdiIdentifier } from "@adaptive-ds/mdi/mdiIdentifier.js"
import { mdiKeyOutline } from "@adaptive-ds/mdi/mdiKeyOutline.js"
import { mdiKeyVariant } from "@adaptive-ds/mdi/mdiKeyVariant.js"
import { mdiLightbulbOutline } from "@adaptive-ds/mdi/mdiLightbulbOutline.js"
import { mdiTextBoxOutline } from "@adaptive-ds/mdi/mdiTextBoxOutline.js"
import { mdiTwoFactorAuthentication } from "@adaptive-ds/mdi/mdiTwoFactorAuthentication.js"
import { mdiWeb } from "@adaptive-ds/mdi/mdiWeb.js"

const fieldIconPathCatalog: Record<string, string> = {
  accountnumber: mdiIdentifier,
  authenticatorapp: mdiTwoFactorAuthentication,
  authenticatorkeytotpseed: mdiTwoFactorAuthentication,
  confirmmasterpassword: mdiFormTextboxPassword,
  email: mdiEmailOutline,
  emailaddress: mdiEmailOutline,
  fullname: mdiAccountOutline,
  masterpassword: mdiFormTextboxPassword,
  masterpasswordhint: mdiLightbulbOutline,
  name: mdiAccountOutline,
  onetimepassword2fa: mdiTwoFactorAuthentication,
  password: mdiFormTextboxPassword,
  recoverycode: mdiKeyVariant,
  recoveryphrase: mdiKeyVariant,
  securitykey: mdiKeyOutline,
  securitykeyorpasskey: mdiKeyOutline,
  totp: mdiTwoFactorAuthentication,
  totpcode: mdiTwoFactorAuthentication,
  username: mdiAccountOutline,
  uri: mdiWeb,
  website: mdiWeb,
}

/** Resolve a shared semantic icon path for a vault field label. */
export function fieldIconPathGet(label: string): string {
  const normalizedLabel = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\d+$/, "")
  return fieldIconPathCatalog[normalizedLabel] ?? mdiTextBoxOutline
}
