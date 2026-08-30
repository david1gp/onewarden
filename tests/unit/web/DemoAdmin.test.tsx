import { expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
import { DemoAdmin } from "../../../src/web/demo/DemoAdmin.jsx"

test("DemoAdmin renders the admin route shell and accessible navigation", () => {
  const screen = render(() => <DemoAdmin />)

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("OneWarden Administration")
  expect(screen.getByRole("navigation", { name: "Admin sections" })).toBeDefined()
  expect(screen.getByRole("navigation", { name: "Demo Views" })).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.getByRole("heading", { level: 2, name: "Settings" }).textContent).toBe("Settings")
  expect(screen.getByText("Demo mode")).toBeDefined()

  screen.unmount()
})
