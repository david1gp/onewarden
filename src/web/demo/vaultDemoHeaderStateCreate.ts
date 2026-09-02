import type { PageNameDemo } from "./demo_url/pageNameDemo.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { urlDemo } from "./demo_url/urlDemo.js"
import { demoNavigationClickHandleCreate } from "./demoNavigationClickHandleCreate.js"

export interface VaultDemoHeaderProps {
  currentDemo: PageNameDemo
  title?: string
  showTitle?: boolean
  navigate?: (path: string) => void
}

export function vaultDemoHeaderStateCreate(props: VaultDemoHeaderProps) {
  const demoLinks = [
    { id: pageNameDemo.allItems, path: urlDemo(pageNameDemo.allItems), label: "All Items" },
    { id: pageNameDemo.login, path: urlDemo(pageNameDemo.login), label: "Login" },
    { id: pageNameDemo.secureNote, path: urlDemo(pageNameDemo.secureNote), label: "Secure Note" },
    { id: pageNameDemo.creditCard, path: urlDemo(pageNameDemo.creditCard), label: "Credit Card" },
    { id: pageNameDemo.identity, path: urlDemo(pageNameDemo.identity), label: "Identity" },
    { id: pageNameDemo.sshKey, path: urlDemo(pageNameDemo.sshKey), label: "SSH Key" },
    { id: pageNameDemo.emptyState, path: urlDemo(pageNameDemo.emptyState), label: "Empty State" },
    { id: pageNameDemo.trash, path: urlDemo(pageNameDemo.trash), label: "Trash" },
    { id: pageNameDemo.locked, path: urlDemo(pageNameDemo.locked), label: "Locked" },
    { id: pageNameDemo.admin, path: urlDemo(pageNameDemo.admin), label: "Admin" },
    { id: "settings", path: urlDemo(pageNameDemo.demoSettings), label: "Settings" },
  ]
  const navigateTo = demoNavigationClickHandleCreate(props.navigate)

  return {
    demoLinks,
    directoryPath: urlDemo(pageNameDemo.directory),
    navigateTo,
    currentDemo: () => props.currentDemo,
    title: () => props.title ?? "OneWarden Demo",
    showTitle: () => props.showTitle ?? true,
  }
}
