import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import {
  type EmergencyAccessContact,
  emergencyAccessContactSchema,
  emergencyAccessListResponseSchema,
} from "./emergencyAccessSchema.js"
import type { EmergencyAccessInviteRequest } from "./emergencyAccessInviteRequestSchema.js"
import type { EmergencyAccessTakeoverRequest } from "./emergencyAccessTakeoverRequestSchema.js"
import type { EmergencyAccessUpdateRequest } from "./emergencyAccessUpdateRequestSchema.js"

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

async function responseJsonParse<TSchema extends v.GenericSchema>(
  op: string,
  response: Response,
  schema: TSchema,
): Promise<Result<v.InferOutput<TSchema>>> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return resultErrorCreate(op, "Failed to read server response.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }

  if (!response.ok) {
    return resultTryParsingFetchErr(op, text, response.status, response.statusText)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return resultErrorCreate(op, "Server returned invalid JSON response.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  const parsed = v.safeParse(schema, json)
  if (!parsed.success) {
    return resultErrorCreate(op, "Server response did not match expected schema.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  return resultCreate(parsed.output)
}

async function responseEmptyParse(op: string, response: Response): Promise<Result<void>> {
  if (response.ok) {
    return resultCreate(undefined)
  }
  let text = ""
  try {
    text = await response.text()
  } catch {
    // ignore
  }
  return resultTryParsingFetchErr(op, text, response.status, response.statusText)
}

export function webEmergencyAccessApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const baseUrl = options.baseUrl ?? ""
  const fetchImpl = options.fetch ?? fetch

  const trustedGet = async (accessToken: string): Promise<Result<EmergencyAccessContact[]>> => {
    const op = "webEmergencyAccessApiClient.trustedGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/trusted`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching trusted emergency contacts.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await responseJsonParse(op, response, emergencyAccessListResponseSchema)
    if (!result.success) return result
    return resultCreate(result.data.data)
  }

  const grantedGet = async (accessToken: string): Promise<Result<EmergencyAccessContact[]>> => {
    const op = "webEmergencyAccessApiClient.grantedGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/granted`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching granted emergency contacts.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await responseJsonParse(op, response, emergencyAccessListResponseSchema)
    if (!result.success) return result
    return resultCreate(result.data.data)
  }

  const invite = async (accessToken: string, payload: EmergencyAccessInviteRequest): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.invite"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error inviting emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  const reinvite = async (accessToken: string, id: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.reinvite"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/reinvite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error resending invitation.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  const update = async (
    accessToken: string,
    id: string,
    payload: EmergencyAccessUpdateRequest,
  ): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.update"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error updating emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, emergencyAccessContactSchema)
  }

  const confirm = async (accessToken: string, id: string, key: string): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.confirm"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ key }),
      })
    } catch {
      return resultErrorCreate(op, "Network error confirming emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, emergencyAccessContactSchema)
  }

  const accept = async (accessToken: string, id: string, token: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.accept"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ token }),
      })
    } catch {
      return resultErrorCreate(op, "Network error accepting emergency contact invitation.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  const deleteAccess = async (accessToken: string, id: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.deleteAccess"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  const initiate = async (accessToken: string, id: string): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.initiate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/initiate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error initiating emergency access recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, emergencyAccessContactSchema)
  }

  const approve = async (accessToken: string, id: string): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.approve"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error approving emergency access recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, emergencyAccessContactSchema)
  }

  const reject = async (accessToken: string, id: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.reject"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error rejecting emergency access recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  const view = async (accessToken: string, id: string): Promise<Result<Record<string, unknown>[]>> => {
    const op = "webEmergencyAccessApiClient.view"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error viewing emergency vault items.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    }
    try {
      const json = (await response.json()) as { ciphers?: unknown }
      if (!Array.isArray(json.ciphers)) return resultErrorCreate(op, "Invalid emergency vault items response.")
      return resultCreate(json.ciphers as Record<string, unknown>[])
    } catch {
      return resultErrorCreate(op, "Invalid emergency vault view JSON.")
    }
  }

  const takeover = async (accessToken: string, id: string): Promise<Result<Record<string, unknown>>> => {
    const op = "webEmergencyAccessApiClient.takeover"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/takeover`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error initiating emergency takeover.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    }
    try {
      const json = (await response.json()) as Record<string, unknown>
      return resultCreate(json)
    } catch {
      return resultErrorCreate(op, "Invalid emergency takeover JSON.")
    }
  }

  const password = async (
    accessToken: string,
    id: string,
    payload: EmergencyAccessTakeoverRequest,
  ): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.password"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error updating grantor password during takeover.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  return {
    trustedGet,
    grantedGet,
    invite,
    reinvite,
    update,
    confirm,
    accept,
    deleteAccess,
    initiate,
    approve,
    reject,
    view,
    takeover,
    password,
  }
}
