import { expect, test } from "bun:test"
import { extensionHostPermissionRequest } from "../../../src/extension/fullwindow/extensionHostPermissionRequest.js"

const selfHostedSettings = {
  region: "selfHosted" as const,
  base: "https://vault.example.com/onewarden",
  webVault: "",
  api: "https://api.example.com/onewarden/api",
  identity: "https://identity.example.com/onewarden/identity",
  icons: "",
  notifications: "",
  events: "",
}

test("extensionHostPermissionRequest requests only the configured API and identity origins", async () => {
  let requestedOrigins: string[] | undefined
  const result = await extensionHostPermissionRequest(selfHostedSettings, {
    request: async (permissions) => {
      requestedOrigins = permissions.origins
      return true
    },
  })

  expect(result).toEqual({ success: true, data: undefined })
  expect(requestedOrigins).toEqual(["https://api.example.com/*", "https://identity.example.com/*"])
})

test("extensionHostPermissionRequest reports denied server access", async () => {
  const result = await extensionHostPermissionRequest(selfHostedSettings, {
    request: async () => false,
  })

  expect(result).toMatchObject({
    success: false,
    code: "platform.forbidden",
    statusCode: 403,
  })
})
