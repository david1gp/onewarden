import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { HibpRouteOptions } from "./hibpRouteOptions.js"
import { hibpBreachSyntheticResponseCreate } from "./hibpBreachSyntheticResponseCreate.js"
import { hibpBreachUrlCreate } from "./hibpBreachUrlCreate.js"

export async function hibpBreachGet(
  username: string,
  options: Pick<HibpRouteOptions, "apiKey" | "http">,
): Promise<Result<unknown>> {
  const apiKey = options.apiKey?.trim()
  if (apiKey === undefined || apiKey === "") return resultCreate(hibpBreachSyntheticResponseCreate(username))

  let response: Response
  try {
    response = await options.http.fetch(hibpBreachUrlCreate(username), {
      headers: { "hibp-api-key": apiKey, "user-agent": "Vaultwarden" },
      method: "GET",
    })
  } catch {
    return resultErrorCreate("hibpBreachGet", "The HIBP request failed.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }

  if (response.status === 404)
    return resultErrorCreate("hibpBreachGet", "The HIBP account was not found.", {
      code: "platform.not-found",
      statusCode: 404,
    })
  if (!response.ok)
    return resultErrorCreate("hibpBreachGet", "The HIBP request returned an error.", {
      code: "platform.unavailable",
      statusCode: 503,
    })

  try {
    return resultCreate(await response.json())
  } catch {
    return resultErrorCreate("hibpBreachGet", "The HIBP response was invalid.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }
}
