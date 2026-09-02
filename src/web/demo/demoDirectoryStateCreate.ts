import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { urlDemo } from "./demo_url/urlDemo.js"
import { demoNavigationClickHandleCreate } from "./demoNavigationClickHandleCreate.js"

export interface DemoDirectoryItem {
  id: string
  path: string
  title: string
  category: string
  description: string
  badgeText: string
  badgeVariant?: "subtle" | "outline" | "contrast" | "filledGreen" | "filledYellow" | "filledBlue" | "filledRed"
}

export function demoDirectoryStateCreate(props: Readonly<{ readonly navigate?: (path: string) => void }> = {}) {
  const demos: readonly DemoDirectoryItem[] = [
    {
      id: "admin",
      path: urlDemo(pageNameDemo.admin),
      title: "Administration Workspace",
      category: "Administration",
      description: "Backend-free server administration workspace for settings, users, organizations, and diagnostics.",
      badgeText: "Admin Demo",
      badgeVariant: "filledBlue",
    },
    {
      id: "settings",
      path: urlDemo(pageNameDemo.demoSettings),
      title: "Account Settings",
      category: "Settings",
      description: "Interactive account settings for profile, security, email, devices, emergency access, and tools.",
      badgeText: "Settings Demo",
      badgeVariant: "filledBlue",
    },
    {
      id: "extension",
      path: urlDemo(pageNameDemo.extensionDemo),
      title: "Extension Surfaces",
      category: "Extension",
      description: "Popup, full-window vault, generator, settings, and passkey consent visual states.",
      badgeText: "Extension Gallery",
      badgeVariant: "filledBlue",
    },
    {
      id: "all-items",
      path: urlDemo(pageNameDemo.allItems),
      title: "All Items & Multi-Vault Workspace",
      category: "Full Vault",
      description:
        "Wide 3-column layout displaying 17 fictional credentials across Personal and Acme Corporation vaults with collections and folders.",
      badgeText: "17 Items",
      badgeVariant: "subtle",
    },
    {
      id: "login",
      path: urlDemo(pageNameDemo.login),
      title: "Selected Login Credential",
      category: "Logins",
      description:
        "GitHub Enterprise admin login with username copy, concealed password toggle, TOTP 2FA code, and custom SSH keys.",
      badgeText: "2FA Active",
      badgeVariant: "filledGreen",
    },
    {
      id: "secure-note",
      path: urlDemo(pageNameDemo.secureNote),
      title: "Selected Secure Note",
      category: "Notes",
      description:
        "Office Wi-Fi network and guest credentials formatted in preformatted blocks with IT support instructions.",
      badgeText: "Encrypted Note",
      badgeVariant: "subtle",
    },
    {
      id: "credit-card",
      path: urlDemo(pageNameDemo.creditCard),
      title: "Selected Credit Card",
      category: "Cards",
      description:
        "Acme Corporate Platinum credit card with masked card number, CVV, expiry date, PIN, and spending limits.",
      badgeText: "Payment Card",
      badgeVariant: "subtle",
    },
    {
      id: "identity",
      path: urlDemo(pageNameDemo.identity),
      title: "Selected Identity Profile",
      category: "Identities",
      description:
        "Alex Rivera engineering profile with employee ID, title, work email, phone number, and department metadata.",
      badgeText: "Corporate ID",
      badgeVariant: "subtle",
    },
    {
      id: "ssh-key",
      path: urlDemo(pageNameDemo.sshKey),
      title: "Selected SSH Key",
      category: "SSH Keys",
      description: "Production Deploy Key (Ed25519) with public key, fingerprint, and concealed passphrase.",
      badgeText: "SSH Key",
      badgeVariant: "subtle",
    },
    {
      id: "empty-state",
      path: urlDemo(pageNameDemo.emptyState),
      title: "Empty Vault State",
      category: "Empty",
      description:
        "Empty vault presentation with zero items, showing empty listing placeholders and filter reset cues.",
      badgeText: "0 Items",
      badgeVariant: "outline",
    },
    {
      id: "trash",
      path: urlDemo(pageNameDemo.trash),
      title: "Trash & Deleted Items",
      category: "Trash",
      description:
        "Deleted items queue (decommissioned databases, deprecated VPN profiles, expired cards) with 30-day retention notices.",
      badgeText: "3 Deleted Items",
      badgeVariant: "filledRed",
    },
    {
      id: "locked",
      path: urlDemo(pageNameDemo.locked),
      title: "Locked Vault State",
      category: "Security",
      description:
        "Locked vault presentation with master password unlock prompt, biometric authentication button, and zero modal dialogs.",
      badgeText: "Vault Locked",
      badgeVariant: "filledRed",
    },
  ]

  return {
    demos,
    navigateTo: demoNavigationClickHandleCreate(props.navigate),
  }
}
