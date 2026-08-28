import { render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { WebApp } from "../../src/web/ui/WebApp.jsx"

test("WebApp renders the OneWarden app shell landmarks", () => {
  const screen = render(() => <WebApp />)

  expect(screen.getByRole("banner")).toBeDefined()
  expect(screen.getByRole("main")).toBeDefined()
  expect(screen.getByRole("contentinfo")).toBeDefined()
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("OneWarden")

  screen.unmount()
})
