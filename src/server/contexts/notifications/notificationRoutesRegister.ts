import type { Hono } from "hono"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"

export function notificationRoutesRegister(app: Hono<AuthenticationEnvironment>, enabled: boolean): void {
  if (!enabled) return
  const upgradeRequired = (): Response =>
    new Response("WebSocket upgrade required.", {
      headers: { connection: "Upgrade", upgrade: "websocket" },
      status: 426,
    })
  app.get("/notifications/hub", upgradeRequired)
  app.get("/notifications/anonymous-hub", upgradeRequired)
}
