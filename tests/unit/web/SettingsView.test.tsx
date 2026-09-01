import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { AccountDangerZoneCard } from "../../../src/web/settings/ui/AccountDangerZoneCard.jsx"
import { AccountDevicesCard } from "../../../src/web/settings/ui/AccountDevicesCard.jsx"
import { AccountEmailChangeCard } from "../../../src/web/settings/ui/AccountEmailChangeCard.jsx"
import { AccountProfileCard } from "../../../src/web/settings/ui/AccountProfileCard.jsx"
import { AccountSecurityCard } from "../../../src/web/settings/ui/AccountSecurityCard.jsx"
import { SettingsView } from "../../../src/web/settings/ui/SettingsView.jsx"
import { VaultImportExportCard } from "../../../src/web/settings/ui/VaultImportExportCard.jsx"

test("SettingsView and tabs render accurately and allow navigation", async () => {
  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })

  storage.sessionSave({
    email: "user@example.com",
    accessToken: "access-token-xyz",
    refreshToken: "refresh-token-xyz",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600_000,
    userId: "user-uuid-123",
    kdf: 0,
    kdfIterations: 600_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "2.iv|key|mac",
  })

  const session = webAuthSessionCreate({ storage })

  let vaultNavigated = 0
  let twoFactorNavigated = 0

  const { container, unmount } = render(() => (
    <SettingsView
      session={session}
      onNavigateToVault={() => vaultNavigated++}
      onNavigateToTwoFactor={() => twoFactorNavigated++}
    />
  ))

  // Should render main headings
  expect(container.textContent).toContain("Account & Security Settings")
  expect(container.textContent).toContain("My Account")
  expect(container.textContent).toContain("Security & KDF")
  expect(container.textContent).toContain("Active Sessions")
  expect(container.textContent).toContain("Import & Export")
  expect(container.textContent).toContain("Danger Zone")

  // The tools tab exposes the personal/organization scope choice through SettingsView wiring
  const toolsNavBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Import & Export"),
  )
  expect(toolsNavBtn).toBeDefined()
  if (toolsNavBtn) {
    fireEvent.click(toolsNavBtn)
    expect(container.textContent).toContain("Import Into")
    expect(container.textContent).toContain("An Organization")
  }

  // Click on Security tab
  const securityNavBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Security & KDF"),
  )
  expect(securityNavBtn).toBeDefined()
  if (securityNavBtn) {
    fireEvent.click(securityNavBtn)
  }

  // Click on Two-Factor button
  const twoFactorBtn = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Two-Step Login Setup"),
  )
  expect(twoFactorBtn).toBeDefined()
  if (twoFactorBtn) {
    fireEvent.click(twoFactorBtn)
    expect(twoFactorNavigated).toBe(1)
  }

  // Click Back to Vault button
  const backBtn = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("Back to Vault"))
  expect(backBtn).toBeDefined()
  if (backBtn) {
    fireEvent.click(backBtn)
    expect(vaultNavigated).toBe(1)
  }

  unmount()
})

test("Account individual cards render expected forms and controls", async () => {
  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })
  const session = webAuthSessionCreate({ storage })

  // Profile Card
  const profileRender = render(() => <AccountProfileCard session={session} />)
  expect(profileRender.container.textContent).toContain("My Profile")
  expect(profileRender.container.textContent).toContain("Display Name")
  expect(profileRender.container.textContent).toContain("API Key")
  profileRender.unmount()

  // Security Card
  const secRender = render(() => <AccountSecurityCard session={session} />)
  expect(secRender.container.textContent).toContain("Change Master Password")
  expect(secRender.container.textContent).toContain("Key Derivation Function (KDF)")
  expect(secRender.container.textContent).toContain("Rotate Encryption Keys")
  expect(secRender.container.textContent).toContain("Deauthorize All Sessions")
  secRender.unmount()

  // Email Card
  const emailRender = render(() => <AccountEmailChangeCard session={session} />)
  expect(emailRender.container.textContent).toContain("Change Account Email")
  expect(emailRender.container.textContent).toContain("New Email Address")
  emailRender.unmount()

  // Devices Card
  const devicesRender = render(() => <AccountDevicesCard session={session} />)
  expect(devicesRender.container.textContent).toContain("Authorized Devices & Sessions")
  expect(devicesRender.container.textContent).toContain("Refresh")
  devicesRender.unmount()

  // Import / Export Card
  const importExportRender = render(() => <VaultImportExportCard session={session} />)
  expect(importExportRender.container.textContent).toContain("Import & Export")
  expect(importExportRender.container.textContent).toContain("Import Vault")
  expect(importExportRender.container.textContent).toContain("Export Vault")
  expect(importExportRender.container.textContent).toContain("Import Into")
  expect(importExportRender.container.textContent).toContain("My Vault")
  expect(importExportRender.container.textContent).toContain("An Organization")
  importExportRender.unmount()

  // Danger Zone Card
  const dangerRender = render(() => <AccountDangerZoneCard session={session} />)
  expect(dangerRender.container.textContent).toContain("Danger Zone")
  expect(dangerRender.container.textContent).toContain("Delete Account")
  dangerRender.unmount()
})
