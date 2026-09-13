import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiFormTextboxPassword } from "@adaptive-ds/mdi/mdiFormTextboxPassword.js"
import { mdiIdentifier } from "@adaptive-ds/mdi/mdiIdentifier.js"
import { mdiKeyVariant } from "@adaptive-ds/mdi/mdiKeyVariant.js"
import { mdiTextBoxOutline } from "@adaptive-ds/mdi/mdiTextBoxOutline.js"
import { mdiTwoFactorAuthentication } from "@adaptive-ds/mdi/mdiTwoFactorAuthentication.js"
import { mdiWeb } from "@adaptive-ds/mdi/mdiWeb.js"

const fieldIconPathCatalog: Record<string, string> = {
  accountnumber: mdiIdentifier,
  authenticatorkeytotpseed: mdiTwoFactorAuthentication,
  onetimepassword2fa: mdiTwoFactorAuthentication,
  password: mdiFormTextboxPassword,
  recoveryphrase: mdiKeyVariant,
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
