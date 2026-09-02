import { expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
import { Img } from "#ui/static/img/Img.jsx"

test("Img renders an empty alt image with shared image defaults", () => {
  const screen = render(() => <Img src="/icons/example.com/icon.png" alt="" width={16} height={16} class="size-4" />)
  const img = screen.container.querySelector("img")

  expect(img?.getAttribute("alt")).toBe("")
  expect(img?.getAttribute("aria-hidden")).toBeNull()
  expect(img?.getAttribute("class")).toContain("size-4")
  expect(img?.getAttribute("width")).toBe("16")
  expect(img?.getAttribute("loading")).toBe("lazy")
  expect(img?.getAttribute("decoding")).toBe("async")

  screen.unmount()
})

test("Img keeps meaningful alt text exposed to assistive technology", () => {
  const screen = render(() => <Img src="/logo.png" alt="Company logo" />)
  const img = screen.container.querySelector("img")

  expect(img?.getAttribute("alt")).toBe("Company logo")
  expect(img?.getAttribute("aria-hidden")).toBeNull()

  screen.unmount()
})

test("Img renders a lazy-loaded image without custom event props", () => {
  const screen = render(() => <Img src="/logo.png" alt="" />)
  const img = screen.container.querySelector("img")

  expect(img?.getAttribute("loading")).toBe("lazy")
  expect(img?.getAttribute("decoding")).toBe("async")

  screen.unmount()
})
