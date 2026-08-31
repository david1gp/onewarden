import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
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
    let text: string
    try {
      text = await response.text()
    } catch {
      return resultErrorCreate(op, "Session handoff response could not be read.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    if (!response.ok) return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    let input: unknown
    try {
      input = JSON.parse(text)
    } catch {
      return resultErrorCreate(op, "Session handoff response was invalid.", {
        code: "platform.internal",
        statusCode: 500,
      })
    }
    const parsed = v.safeParse(sessionHandoffConsumeResponseSchema, input)
    if (!parsed.success) {
      return resultErrorCreate(op, "Session handoff response was invalid.", {
        code: "platform.internal",
        statusCode: 500,
      })
    }
    return resultCreate(parsed.output)
  }

  return { consume }
}
