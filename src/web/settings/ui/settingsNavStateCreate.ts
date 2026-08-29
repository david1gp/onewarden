import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"

export type SettingsTabName = "profile" | "security" | "email" | "devices" | "emergency" | "tools" | "danger"

export interface SettingsNavItem {
  id: SettingsTabName
  label: string
  icon: string
  description: string
}

export interface SettingsNavStateCreateProps {
  currentTab: () => SettingsTabName
  onSelectTab: (tab: SettingsTabName) => void
  onBackToVault?: () => void
  onNavigateToTwoFactor?: () => void
}

export function settingsNavStateCreate(props: SettingsNavStateCreateProps) {
  const navItems: SettingsNavItem[] = [
    {
      id: "profile",
      label: "My Account",
      icon: vaultSvgIcons.personalVault,
      description: "Profile information, avatar, and API keys",
    },
    {
      id: "security",
      label: "Security & KDF",
      icon: vaultSvgIcons.shieldCheck,
      description: "Master password, encryption keys, and KDF algorithm",
    },
    {
      id: "email",
      label: "Email Address",
      icon: vaultSvgIcons.email,
      description: "Verify or update your account email",
    },
    {
      id: "devices",
      label: "Active Sessions",
      icon: vaultSvgIcons.server,
      description: "Authorized devices and active sessions",
    },
    {
      id: "emergency",
      label: "Emergency Access",
      icon: vaultSvgIcons.lifebuoy,
      description: "Trusted emergency contacts and granted access",
    },
    {
      id: "tools",
      label: "Import & Export",
      icon: vaultSvgIcons.refresh,
      description: "Import or export your encrypted vault",
    },
    {
      id: "danger",
      label: "Danger Zone",
      icon: vaultSvgIcons.trash,
      description: "Delete account permanently",
    },
  ]

  const isTabActive = (tabId: SettingsTabName) => props.currentTab() === tabId

  const handleSelectTab = (tabId: SettingsTabName) => {
    props.onSelectTab(tabId)
  }

  const handleBackToVault = () => {
    props.onBackToVault?.()
  }

  const handleNavigateToTwoFactor = () => {
    props.onNavigateToTwoFactor?.()
  }

  return {
    navItems,
    isTabActive,
    handleSelectTab,
    handleBackToVault,
    handleNavigateToTwoFactor,
  }
}
