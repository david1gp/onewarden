import { type Result } from "#result"
import { webApiResponseParse } from "../../../shared/api/webApiResponseParse.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { SessionHandoffConsumeRequest } from "../../../shared/sessionHandoff/sessionHandoffConsumeRequestSchema.js"
import {
  type SessionHandoffConsumeResponse,
  sessionHandoffConsumeResponseSchema,
} from "../../../shared/sessionHandoff/sessionHandoffConsumeResponseSchema.js"

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function webSessionHandoffApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const fetchImplementation = options.fetch ?? globalThis.fetch
  const baseUrl = options.baseUrl ?? ""

  const consume = async (
    token: string,
    request: SessionHandoffConsumeRequest,
  ): Promise<Result<SessionHandoffConsumeResponse>> => {
    const op = "webSessionHandoffApiClient.consume"
    let response: Response
    try {
      response = await fetchImplementation(`${baseUrl}/api/extension/handoffs/consume`, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Handoff ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      })
    } catch {
      return resultErrorCreate(op, "Session handoff request failed.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, sessionHandoffConsumeResponseSchema)
  }

  return { consume }
}
