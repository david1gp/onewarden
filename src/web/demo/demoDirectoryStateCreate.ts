export interface DemoDirectoryItem {
  id: string
  path: string
  title: string
  category: string
  description: string
  badgeText: string
  badgeVariant?: "subtle" | "outline" | "contrast" | "filledGreen" | "filledYellow" | "filledBlue" | "filledRed"
}

export function demoDirectoryStateCreate() {
  const demos: readonly DemoDirectoryItem[] = [
    {
      id: "admin",
      path: "/demo/admin",
      title: "Administration Workspace",
      category: "Administration",
      description: "Backend-free server administration workspace for settings, users, organizations, and diagnostics.",
      badgeText: "Admin Demo",
      badgeVariant: "filledBlue",
    },
    {
      id: "settings",
      path: "/demo/settings",
      title: "Account Settings",
      category: "Settings",
      description: "Interactive account settings for profile, security, email, devices, emergency access, and tools.",
      badgeText: "Settings Demo",
      badgeVariant: "filledBlue",
    },
    {
      id: "extension",
      path: "/demo/extension",
      title: "Extension Surfaces",
      category: "Extension",
      description: "Popup, full-window vault, generator, settings, and passkey consent visual states.",
      badgeText: "Extension Gallery",
      badgeVariant: "filledBlue",
    },
    {
      id: "all-items",
      path: "/demo/all-items",
      title: "All Items & Multi-Vault Workspace",
      category: "Full Vault",
      description:
        "Wide 3-column layout displaying 17 fictional credentials across Personal and Acme Corporation vaults with collections and folders.",
      badgeText: "17 Items",
      badgeVariant: "subtle",
    },
    {
      id: "login",
      path: "/demo/login",
      title: "Selected Login Credential",
      category: "Logins",
      description:
        "GitHub Enterprise admin login with username copy, concealed password toggle, TOTP 2FA code, and custom SSH keys.",
      badgeText: "2FA Active",
      badgeVariant: "filledGreen",
    },
    {
      id: "secure-note",
      path: "/demo/secure-note",
      title: "Selected Secure Note",
      category: "Notes",
      description:
        "Office Wi-Fi network and guest credentials formatted in preformatted blocks with IT support instructions.",
      badgeText: "Encrypted Note",
      badgeVariant: "subtle",
    },
    {
      id: "credit-card",
      path: "/demo/credit-card",
      title: "Selected Credit Card",
      category: "Cards",
      description:
        "Acme Corporate Platinum credit card with masked card number, CVV, expiry date, PIN, and spending limits.",
      badgeText: "Payment Card",
      badgeVariant: "subtle",
    },
    {
      id: "identity",
      path: "/demo/identity",
      title: "Selected Identity Profile",
      category: "Identities",
      description:
        "Alex Rivera engineering profile with employee ID, title, work email, phone number, and department metadata.",
      badgeText: "Corporate ID",
      badgeVariant: "subtle",
    },
    {
      id: "ssh-key",
      path: "/demo/ssh-key",
      title: "Selected SSH Key",
      category: "SSH Keys",
      description: "Production Deploy Key (Ed25519) with public key, fingerprint, and concealed passphrase.",
      badgeText: "SSH Key",
      badgeVariant: "subtle",
    },
    {
      id: "empty-state",
      path: "/demo/empty-state",
      title: "Empty Vault State",
      category: "Empty",
      description:
        "Empty vault presentation with zero items, showing empty listing placeholders and filter reset cues.",
      badgeText: "0 Items",
      badgeVariant: "outline",
    },
    {
      id: "trash",
      path: "/demo/trash",
      title: "Trash & Deleted Items",
      category: "Trash",
      description:
        "Deleted items queue (decommissioned databases, deprecated VPN profiles, expired cards) with 30-day retention notices.",
      badgeText: "3 Deleted Items",
      badgeVariant: "filledRed",
    },
    {
      id: "locked",
      path: "/demo/locked",
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
  }
}
