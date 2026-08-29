import type { Context, Hono } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestQueryParse } from "../../../shared/validation/requestQueryParse.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { hibpBreachGet } from "./hibpBreachGet.js"
import { hibpBreachNotFoundResponseCreate } from "./hibpBreachNotFoundResponseCreate.js"
import { hibpBreachQuerySchema } from "./hibpBreachQuerySchema.js"
import { hibpBreachResponseCreate } from "./hibpBreachResponseCreate.js"
import type { HibpRouteOptions } from "./hibpRouteOptions.js"

export function hibpRoutesRegister(app: Hono<AuthenticationEnvironment>, options: HibpRouteOptions): void {
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const breach = async (context: Context<AuthenticationEnvironment>) => {
    const queryResult = requestQueryParse(context, hibpBreachQuerySchema)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)

    const result = await hibpBreachGet(queryResult.data.username, options)
    if (!result.success) {
      if (result.code === "platform.not-found") return hibpBreachNotFoundResponseCreate()
      return apiErrorResponseCreate(result)
    }
    return hibpBreachResponseCreate(result.data)
  }

  app.get("/api/hibp/breach", authenticate("hibp_breach"), breach)
}
