import type { Hono } from "hono"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import type { IdentityRouteOptions } from "./identityRouteOptions.js"

export function identityTasksRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  _options: IdentityRouteOptions,
): void {
  app.get("/api/tasks", (context) => context.json({ data: [], object: "list" as const }))
}
