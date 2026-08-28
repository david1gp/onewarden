import { expect, test } from "bun:test"
import { iconContentTypeResolve } from "../../../src/server/contexts/icons/iconContentTypeResolve.js"

test("iconContentTypeResolve recognizes supported magic bytes", () => {
  expect(iconContentTypeResolve(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("png")
  expect(iconContentTypeResolve(Uint8Array.from([0, 0, 1, 0, 1, 0]))).toBe("x-icon")
  expect(iconContentTypeResolve(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))).toBe("webp")
  expect(iconContentTypeResolve(Uint8Array.from([255, 216, 255, 224]))).toBe("jpeg")
  expect(iconContentTypeResolve(Uint8Array.from([71, 73, 70, 56, 57, 97]))).toBe("gif")
  expect(iconContentTypeResolve(Uint8Array.from([66, 77, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("bmp")
  expect(iconContentTypeResolve(new TextEncoder().encode('<?xml version="1.0"?><svg></svg>'))).toBe("svg+xml")
})

test("iconContentTypeResolve rejects content-type spoofing and unknown bytes", () => {
  expect(iconContentTypeResolve(new TextEncoder().encode("<html>not an icon</html>"))).toBeUndefined()
  expect(iconContentTypeResolve(Uint8Array.from([1, 2, 3]))).toBeUndefined()
})
