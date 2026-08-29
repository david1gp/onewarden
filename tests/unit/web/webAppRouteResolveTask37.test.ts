import { expect, test } from "bun:test"
import { webAppRouteResolve } from "../../../src/web/ui/webAppRouteResolve.js"

test("webAppRouteResolve resolves Send, Emergency Access, and Admin routes accurately", () => {
  // Sends
  expect(webAppRouteResolve("/sends")).toBe("sends")
  expect(webAppRouteResolve("/send")).toBe("sends")
  expect(webAppRouteResolve("/sends/")).toBe("sends")
  expect(webAppRouteResolve("/send/xyz-123")).toBe("send-access")
  expect(webAppRouteResolve("/sends/access/xyz-123")).toBe("send-access")
  expect(webAppRouteResolve("/send-access")).toBe("send-access")

  // Emergency Access
  expect(webAppRouteResolve("/emergency-access")).toBe("emergency-access")
  expect(webAppRouteResolve("/emergency")).toBe("emergency-access")
  expect(webAppRouteResolve("/settings/emergency")).toBe("emergency-access")

  // Admin
  expect(webAppRouteResolve("/admin")).toBe("root")
  expect(webAppRouteResolve("/admin/users")).toBe("root")
  expect(webAppRouteResolve("/admin-ui")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/dashboard")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/users")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/organizations")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/diagnostics")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/config")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/tools")).toBe("admin")
  expect(webAppRouteResolve("/admin-ui/login")).toBe("admin-login")

  // Existing routes preserved
  expect(webAppRouteResolve("/")).toBe("root")
  expect(webAppRouteResolve("/login")).toBe("auth-login")
  expect(webAppRouteResolve("/settings")).toBe("settings")
  expect(webAppRouteResolve("/settings/profile")).toBe("settings")
  expect(webAppRouteResolve("/settings/security")).toBe("settings")
  expect(webAppRouteResolve("/settings/devices")).toBe("settings")
  expect(webAppRouteResolve("/settings/tools")).toBe("settings")
})
