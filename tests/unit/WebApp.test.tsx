import { expect, test } from "bun:test"
import { Route, Router } from "@solidjs/router"
import { fireEvent, render, waitFor } from "@solidjs/testing-library"
import { AuthUnlockCard } from "../../src/web/auth/ui/AuthUnlockCard.jsx"
import { DemoAllItems } from "../../src/web/demo/DemoAllItems.jsx"
import { DemoDirectory } from "../../src/web/demo/DemoDirectory.jsx"
import { DemoLocked } from "../../src/web/demo/DemoLocked.jsx"
import { DemoSelectedLogin } from "../../src/web/demo/DemoSelectedLogin.jsx"
import { WebApp } from "../../src/web/ui/WebApp.jsx"
import { badgeCva1 } from "../../ui/static/badge/badgeCva.jsx"

test("WebApp routes /unlock to login when startup rejects the persisted refresh token", async () => {
  window.happyDOM.setURL("http://localhost/unlock")
  window.history.replaceState(null, "", "/unlock")
  window.localStorage.setItem(
    "onewarden_web_auth_session",
    JSON.stringify({
      email: "user@example.com",
      accessToken: "expired-access-token",
      refreshToken: "invalid-refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() - 1,
      userId: "user-id",
      kdf: 0,
      kdfIterations: 1,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "wrapped-key",
    }),
  )
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "invalid_grant" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })

  try {
    const screen = render(() => (
      <Router>
        <Route path="/*" component={WebApp} />
      </Router>
    ))

    await waitFor(() => {
      expect(window.location.pathname).toBe("/login")
      expect(screen.getByRole("heading", { name: "Log In to OneWarden" })).toBeDefined()
      expect(screen.queryByRole("button", { name: "Unlock Vault" })).toBeNull()
    })
    expect(window.localStorage.getItem("onewarden_web_auth_session")).toBeNull()

    screen.unmount()
  } finally {
    globalThis.fetch = originalFetch
    window.localStorage.removeItem("onewarden_web_auth_session")
    window.happyDOM.setURL("http://localhost/")
  }
})

test("WebApp renders the OneWarden app shell landmarks", async () => {
  const screen = render(() => (
    <Router>
      <Route path="/*" component={WebApp} />
    </Router>
  ))

  await waitFor(() => {
    expect(screen.getByRole("banner")).toBeDefined()
    expect(screen.getByRole("main")).toBeDefined()
    expect(screen.getByRole("contentinfo")).toBeDefined()
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("OneWarden")
  })

  screen.unmount()
})

test("DemoDirectory renders banner, main, skip link, and heading landmarks", () => {
  const screen = render(() => <DemoDirectory />)

  expect(screen.getByRole("banner")).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.getByRole("link", { name: "Skip to main content" })).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("OneWarden UI Demo Directory")

  screen.unmount()
})

test("Demo detail views render banner, main, skip link, and level-1 heading", () => {
  const screenAll = render(() => <DemoAllItems />)
  expect(screenAll.getByRole("banner")).toBeDefined()
  expect(screenAll.getByRole("main")).toBeDefined()
  expect(screenAll.getByRole("link", { name: "Skip to main content" })).toBeDefined()
  expect(screenAll.getByRole("heading", { level: 1 }).textContent).toBe("All Vault Items")
  expect(screenAll.getByRole("navigation", { name: "Demo Views" })).toBeDefined()
  expect(screenAll.getByRole("navigation", { name: "Vault Navigation" })).toBeDefined()
  screenAll.unmount()

  const screenLogin = render(() => <DemoSelectedLogin />)
  expect(screenLogin.getByRole("banner")).toBeDefined()
  expect(screenLogin.getByRole("main")).toBeDefined()
  expect(screenLogin.getByRole("link", { name: "Skip to main content" })).toBeDefined()
  expect(screenLogin.getByRole("heading", { level: 1 }).textContent).toBe("Selected Login Credential")
  screenLogin.unmount()
})

test("AuthUnlockCard provides level 1 heading for /unlock route", () => {
  const screen = render(() => <AuthUnlockCard onSubmit={() => {}} />)
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Vault is Locked")
  screen.unmount()
})

test("DemoLocked renders header h1 and unlock card h2 without duplicate h1", () => {
  const screen = render(() => <DemoLocked />)
  expect(screen.getByRole("banner")).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Locked Vault State")
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Vault is Locked")
  screen.unmount()
})

test("Skip-link click moves focus to main-content", () => {
  const screen = render(() => <DemoDirectory />)
  const skipLink = screen.getByRole("link", { name: "Skip to main content" })
  const main = screen.getByRole("main")

  fireEvent.click(skipLink)
  expect(document.activeElement).toBe(main)

  screen.unmount()
})

test("Badge variant filledGreen uses the shared filled green classes", () => {
  const classes = badgeCva1("filledGreen")
  expect(classes).toContain("bg-green-500")
  expect(classes).toContain("text-white")
  expect(classes).toContain("border-green-500")
})

test("Badge variant filledRed uses the shared filled red classes", () => {
  const classes = badgeCva1("filledRed")
  expect(classes).toContain("bg-red-600")
  expect(classes).toContain("text-white")
  expect(classes).toContain("border-red-600")
})

test("Badge variant subtle uses the shared muted classes", () => {
  const classes = badgeCva1("subtle")
  expect(classes).toContain("bg-slate-100")
  expect(classes).toContain("text-slate-900")
  expect(classes).toContain("dark:bg-slate-700")
  expect(classes).toContain("dark:text-slate-100")
})
