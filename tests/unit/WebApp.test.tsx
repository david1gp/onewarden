import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { AuthUnlockCard } from "../../src/web/auth/ui/AuthUnlockCard.jsx"
import { DemoAllItems } from "../../src/web/demo/DemoAllItems.jsx"
import { DemoDirectory } from "../../src/web/demo/DemoDirectory.jsx"
import { DemoLocked } from "../../src/web/demo/DemoLocked.jsx"
import { DemoSelectedLogin } from "../../src/web/demo/DemoSelectedLogin.jsx"
import { WebApp } from "../../src/web/ui/WebApp.jsx"
import { badgeCva1 } from "../../ui/static/badge/badgeCva.jsx"

test("WebApp renders the OneWarden app shell landmarks", () => {
  const screen = render(() => <WebApp />)

  expect(screen.getByRole("banner")).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.getByRole("contentinfo")).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("OneWarden")

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

test("Badge variant filledGreen uses accessible green-700 contrast classes", () => {
  const classes = badgeCva1("filledGreen")
  expect(classes).toContain("bg-green-700")
  expect(classes).toContain("text-white")
  expect(classes).toContain("border-green-700")
  expect(classes).toContain("dark:bg-green-700")
})

test("Badge variant filledRed uses accessible red-700 contrast classes", () => {
  const classes = badgeCva1("filledRed")
  expect(classes).toContain("bg-red-700")
  expect(classes).toContain("text-white")
  expect(classes).toContain("border-red-700")
  expect(classes).toContain("dark:bg-red-700")
})

test("Badge variant subtle uses explicit border and text contrast classes", () => {
  const classes = badgeCva1("subtle")
  expect(classes).toContain("bg-slate-100")
  expect(classes).toContain("text-slate-900")
  expect(classes).toContain("border-slate-200")
  expect(classes).toContain("dark:bg-slate-700")
  expect(classes).toContain("dark:text-slate-100")
})
