export interface VaultDemoHeaderProps {
  currentDemo: string
  title?: string
  showTitle?: boolean
}

export function vaultDemoHeaderStateCreate(props: VaultDemoHeaderProps) {
  const demoLinks = [
    { id: "all-items", path: "/demo/all-items", label: "All Items" },
    { id: "login", path: "/demo/login", label: "Login" },
    { id: "secure-note", path: "/demo/secure-note", label: "Secure Note" },
    { id: "credit-card", path: "/demo/credit-card", label: "Credit Card" },
    { id: "identity", path: "/demo/identity", label: "Identity" },
    { id: "ssh-key", path: "/demo/ssh-key", label: "SSH Key" },
    { id: "empty-state", path: "/demo/empty-state", label: "Empty State" },
    { id: "trash", path: "/demo/trash", label: "Trash" },
    { id: "locked", path: "/demo/locked", label: "Locked" },
    { id: "admin", path: "/demo/admin", label: "Admin" },
    { id: "settings", path: "/demo/settings", label: "Settings" },
  ]

  return {
    demoLinks,
    currentDemo: () => props.currentDemo,
    title: () => props.title ?? "OneWarden Demo",
    showTitle: () => props.showTitle ?? true,
  }
}
