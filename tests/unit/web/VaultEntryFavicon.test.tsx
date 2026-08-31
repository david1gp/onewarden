import { expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
import { VaultEntryFavicon } from "../../../src/web/demo/VaultEntryFavicon.jsx"

const categoryIcon = "M0 0h24v24H0z"

test("VaultEntryFavicon keeps a fixed-size container with the category icon fallback", () => {
  const screen = render(() => (
    <VaultEntryFavicon url={() => "https://example.com/login"} categoryIcon={() => categoryIcon} />
  ))
  const container = screen.container.firstElementChild

  expect(container?.getAttribute("class")).toContain("size-7")
  expect(container?.getAttribute("class")).toContain("shrink-0")
  expect(screen.container.querySelector("svg")).not.toBeNull()

  screen.unmount()
})

// happy-dom never loads real image bytes and fires `error` on every <img>, so an entry with a
// usable URL settles into the category-icon fallback. Successful-load rendering is covered by the
// browser tests; the decorative/lazy image contract is covered by the shared Img primitive tests.
test("VaultEntryFavicon falls back to the visible category icon when the favicon fails to load", () => {
  const screen = render(() => (
    <VaultEntryFavicon url={() => "https://example.com/login"} categoryIcon={() => categoryIcon} />
  ))

  expect(screen.container.querySelector("img")).toBeNull()
  expect(screen.container.querySelector("svg")?.getAttribute("class")).not.toContain("invisible")

  screen.unmount()
})

test("VaultEntryFavicon renders only the category icon for entries without a usable URL", () => {
  const screen = render(() => <VaultEntryFavicon url={() => "ssh://example.com"} categoryIcon={() => categoryIcon} />)

  expect(screen.container.querySelector("img")).toBeNull()
  expect(screen.container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")

  screen.unmount()
})
