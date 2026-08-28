import { expect, test } from "bun:test"
import { iconConfigCreate } from "../../../src/server/contexts/icons/iconConfigCreate.js"
import { iconConfigLoad } from "../../../src/server/contexts/icons/iconConfigLoad.js"

test("iconConfigLoad applies Vaultwarden icon defaults", () => {
  expect(iconConfigLoad({})).toEqual({ success: true, data: iconConfigCreate() })
})

test("iconConfigLoad parses cache, SSRF, and redirect settings", () => {
  const result = iconConfigLoad({
    DISABLE_ICON_DOWNLOAD: "true",
    HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS: "false",
    HTTP_REQUEST_BLOCK_REGEX: "^blocked\\.",
    ICON_CACHE_FOLDER: " /var/cache/onewarden/icons ",
    ICON_CACHE_NEGTTL: "12",
    ICON_CACHE_TTL: "34",
    ICON_DOWNLOAD_TIMEOUT: "5",
    ICON_REDIRECT_CODE: "307",
    ICON_SERVICE: "https://icons.example.test/{}/icon.png",
  })

  expect(result).toEqual({
    success: true,
    data: {
      DISABLE_ICON_DOWNLOAD: true,
      HTTP_REQUEST_BLOCK_NON_GLOBAL_IPS: false,
      HTTP_REQUEST_BLOCK_REGEX: "^blocked\\.",
      ICON_CACHE_FOLDER: "/var/cache/onewarden/icons",
      ICON_CACHE_NEGTTL: 12,
      ICON_CACHE_TTL: 34,
      ICON_DOWNLOAD_TIMEOUT: 5,
      ICON_REDIRECT_CODE: 307,
      ICON_SERVICE: "https://icons.example.test/{}/icon.png",
    },
  })
})

test("iconConfigLoad rejects malformed custom services and redirect codes", () => {
  expect(iconConfigLoad({ ICON_SERVICE: "https://icons.example.test/icon.png" }).success).toBe(false)
  expect(iconConfigLoad({ ICON_SERVICE: "https://icons.example.test/{}/{}/icon.png" }).success).toBe(false)
  expect(iconConfigLoad({ ICON_REDIRECT_CODE: "303" }).success).toBe(false)
})
