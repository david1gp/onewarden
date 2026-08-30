import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { hibpBreachSyntheticResponseCreate } from "./hibpBreachSyntheticResponseCreate.js"
import { hibpBreachUrlCreate } from "./hibpBreachUrlCreate.js"
import type { HibpRouteOptions } from "./hibpRouteOptions.js"

export async function hibpBreachGet(
  username: string,
  options: Pick<HibpRouteOptions, "apiKey" | "http">,
): Promise<Result<unknown>> {
  const op = "hibpBreachGet"
  const apiKey = options.apiKey?.trim()
  if (apiKey === undefined || apiKey === "") return resultCreate(hibpBreachSyntheticResponseCreate(username))

  const upstreamError = () =>
    resultErrorCreate(op, "Req", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  let response: Response
  try {
    response = await options.http.fetch(hibpBreachUrlCreate(username), {
      headers: { "hibp-api-key": apiKey, "user-agent": "Vaultwarden" },
      method: "GET",
    })
  } catch {
    return upstreamError()
  }

  if (response.status === 404)
    return resultErrorCreate(op, "", {
      code: "platform.not-found",
      statusCode: 404,
    })
  if (!response.ok) return upstreamError()

  try {
    return resultCreate(await response.json())
  } catch {
    return upstreamError()
  }
}
