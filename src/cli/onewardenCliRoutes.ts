import { buildRouteMap } from "@stricli/core"
import { onewardenStatusCommand } from "./onewardenStatusCommand.js"

export const onewardenCliRoutes = buildRouteMap({
  routes: { status: onewardenStatusCommand },
  defaultCommand: "status",
  docs: { brief: "OneWarden command-line tools" },
})
