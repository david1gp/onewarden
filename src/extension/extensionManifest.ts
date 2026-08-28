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
  permissions: ["storage", "alarms", "activeTab", "scripting"],
  host_permissions: [
    "https://api.bitwarden.com/*",
    "https://identity.bitwarden.com/*",
    "https://api.bitwarden.eu/*",
    "https://identity.bitwarden.eu/*",
  ],
  optional_host_permissions: ["http://*/*", "https://*/*"],
})
