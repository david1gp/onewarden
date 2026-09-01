import { defineManifest } from "@crxjs/vite-plugin"

/** Chrome MV3 manifest for the OneWarden browser extension build. */
export const extensionManifest = defineManifest({
  manifest_version: 3,
  name: "OneWarden",
  version: "0.0.0",
  description: "OneWarden vault access from the browser.",
  minimum_chrome_version: "116",
  action: {
    default_title: "OneWarden",
    default_popup: "popup/index.html",
  },
  background: {
    service_worker: "background/extensionBackgroundStart.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://*/*", "http://*/*"],
      exclude_matches: ["https://onewarden.contentoren.de/*"],
      js: ["autofill/extensionCredentialNetworkBridgeEntry.ts"],
      run_at: "document_start",
      all_frames: true,
      match_about_blank: true,
      world: "MAIN",
    },
    {
      matches: ["https://*/*", "http://*/*"],
      exclude_matches: ["https://onewarden.contentoren.de/*"],
      js: ["autofill/extensionAutofillContentStart.ts"],
      run_at: "document_start",
      all_frames: true,
      match_about_blank: true,
      world: "ISOLATED",
    },
    {
      matches: ["https://*/*", "http://localhost/*"],
      exclude_matches: ["https://onewarden.contentoren.de/*"],
      js: ["webauthn/extensionWebAuthnPageBridge.ts"],
      run_at: "document_start",
      all_frames: false,
      world: "MAIN",
    },
    {
      matches: ["https://*/*", "http://localhost/*"],
      exclude_matches: ["https://onewarden.contentoren.de/*"],
      js: ["webauthn/extensionWebAuthnContentBridge.ts"],
      run_at: "document_start",
      all_frames: false,
      world: "ISOLATED",
    },
  ],
  permissions: ["storage", "alarms", "activeTab", "scripting", "downloads"],
  host_permissions: [
    "https://api.bitwarden.com/*",
    "https://identity.bitwarden.com/*",
    "https://api.bitwarden.eu/*",
    "https://identity.bitwarden.eu/*",
    "https://*/*",
    "http://localhost/*",
  ],
  optional_host_permissions: ["http://*/*", "https://*/*"],
})
