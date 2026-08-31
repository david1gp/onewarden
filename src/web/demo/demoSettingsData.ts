import { vaultSvgIcons } from "./vaultSvgIcons.js"

export const demoSettingsData = {
  profile: {
    id: "4d7d78d4-31bc-4eec-83e7-demo00000001",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    avatarColor: "#2563eb",
    apiKey: "demo_ow_4f9a8b6d3e1c5a207c2e",
  },
  devices: [
    { id: "device-web", name: "Firefox on Linux", detail: "Web Vault · 192.0.2.42", current: true },
    { id: "device-mobile", name: "Pixel 9", detail: "Android App · 198.51.100.18", current: false },
    { id: "device-extension", name: "Chrome Extension", detail: "Browser Extension · 203.0.113.7", current: false },
  ],
  emergencyContacts: [
    {
      id: "contact-avery",
      name: "Avery Lee",
      email: "avery.lee@example.com",
      access: "View",
      waitDays: 3,
      status: "Invited",
    },
    {
      id: "contact-jamie",
      name: "Jamie Morgan",
      email: "jamie.morgan@example.com",
      access: "Takeover",
      waitDays: 7,
      status: "Accepted",
    },
    {
      id: "contact-riley",
      name: "Riley Chen",
      email: "riley.chen@example.com",
      access: "View",
      waitDays: 14,
      status: "Confirmed",
    },
    {
      id: "contact-sam",
      name: "Sam Rivera",
      email: "sam.rivera@example.com",
      access: "View",
      waitDays: 7,
      status: "Recovery Initiated",
    },
  ],
  emergencyVaults: [
    { id: "vault-casey", email: "casey@example.com", access: "View", waitDays: 5, status: "Invited" },
    { id: "vault-taylor", email: "taylor@example.com", access: "View", waitDays: 5, status: "Confirmed" },
    { id: "vault-jordan", email: "jordan@example.com", access: "View", waitDays: 7, status: "Recovery Approved" },
    {
      id: "vault-morgan",
      email: "morgan@example.com",
      access: "Takeover",
      waitDays: 14,
      status: "Recovery Approved",
    },
  ],
  navigation: [
    { id: "profile", label: "Profile", description: "Identity and API key", icon: vaultSvgIcons.personalVault },
    { id: "security", label: "Security", description: "Password, keys, and KDF", icon: vaultSvgIcons.shieldCheck },
    { id: "email", label: "Email", description: "Account email address", icon: vaultSvgIcons.email },
    { id: "devices", label: "Devices", description: "Authorized sessions", icon: vaultSvgIcons.cellphone },
    { id: "emergency", label: "Emergency Access", description: "Trusted contacts", icon: vaultSvgIcons.lifebuoy },
    { id: "tools", label: "Tools", description: "Import and export", icon: vaultSvgIcons.refresh },
    { id: "appearance", label: "Appearance", description: "Theme and display", icon: vaultSvgIcons.cog },
    { id: "danger", label: "Danger Zone", description: "Destructive actions", icon: vaultSvgIcons.trash },
  ],
} as const
