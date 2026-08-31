import { demoSettingsData } from "./demoSettingsData.js"

type DemoSettingsSection = (typeof demoSettingsData.navigation)[number]["id"]

const demoSettingsSectionAliases: Record<string, DemoSettingsSection> = {
  profile: "profile",
  account: "profile",
  security: "security",
  "two-factor": "security",
  "2fa": "security",
  "two-factor-setup": "security",
  email: "email",
  devices: "devices",
  sessions: "devices",
  emergency: "emergency",
  tools: "tools",
  import: "tools",
  export: "tools",
  appearance: "appearance",
  theme: "appearance",
  danger: "danger",
  "delete-account": "danger",
}

export function demoSettingsSectionResolve(pathname: string): DemoSettingsSection {
  const segment = pathname.replace(/\/+$/, "").split("/").at(-1)?.toLowerCase()
  const alias = segment ?? ""
  if (!Object.hasOwn(demoSettingsSectionAliases, alias)) return "profile"
  return demoSettingsSectionAliases[alias] ?? "profile"
}
