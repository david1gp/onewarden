import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { webContentTypeResolve } from "../../../src/server/contexts/web/webContentTypeResolve.js"
import { webFilePathResolve } from "../../../src/server/contexts/web/webFilePathResolve.js"
import { webTimestampCreate } from "../../../src/server/contexts/web/webTimestampCreate.js"

test("web compatibility formats protocol timestamps with microsecond precision", () => {
  expect(webTimestampCreate(new Date("2026-08-28T00:00:00.123Z"))).toBe("2026-08-28T00:00:00.123000Z")
})

test("web compatibility maps static extensions to response content types", () => {
  expect(webContentTypeResolve("assets/app.js")).toBe("application/javascript")
  expect(webContentTypeResolve("assets/logo.svg")).toBe("image/svg+xml")
  expect(webContentTypeResolve("assets/unknown.bin")).toBe("application/octet-stream")
})

test("web static file paths remain inside their configured folder", () => {
  expect(webFilePathResolve("/srv/onewarden/web", "assets/app.js")).toBe(resolve("/srv/onewarden/web/assets/app.js"))
  expect(webFilePathResolve("/srv/onewarden/web", "../secrets.sqlite3")).toBeUndefined()
  expect(webFilePathResolve("/srv/onewarden/web", "assets/../../secrets.sqlite3")).toBeUndefined()
})
