import * as v from "valibot"
import type { Result } from "#result"
import { webApiAuthenticatedHeadersCreate } from "../../../shared/api/webApiAuthenticatedHeadersCreate.js"
import { webApiResponseEmptyParse } from "../../../shared/api/webApiResponseEmptyParse.js"
import { webApiResponseParse } from "../../../shared/api/webApiResponseParse.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { EmergencyAccessInviteRequest } from "./emergencyAccessInviteRequestSchema.js"
import {
  type EmergencyAccessContact,
  emergencyAccessContactSchema,
  emergencyAccessListResponseSchema,
} from "./emergencyAccessSchema.js"
import type { EmergencyAccessTakeoverRequest } from "./emergencyAccessTakeoverRequestSchema.js"
import type { EmergencyAccessUpdateRequest } from "./emergencyAccessUpdateRequestSchema.js"

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const emergencyAccessCipherSchema = v.record(v.string(), v.unknown())
const emergencyAccessViewResponseSchema = v.object({
  ciphers: v.array(emergencyAccessCipherSchema),
  keyEncrypted: v.optional(v.nullable(v.string())),
  object: v.union([v.literal("emergencyAccessView"), v.literal("list")]),
})
const emergencyAccessTakeoverResponseSchema = v.object({
  kdf: v.number(),
  kdfIterations: v.number(),
  kdfMemory: v.optional(v.nullable(v.number())),
  kdfParallelism: v.optional(v.nullable(v.number())),
  keyEncrypted: v.optional(v.nullable(v.string())),
  object: v.literal("emergencyAccessTakeover"),
})

export function webEmergencyAccessApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const baseUrl = options.baseUrl ?? ""
  const fetchImpl = options.fetch ?? fetch

  const trustedGet = async (accessToken: string): Promise<Result<EmergencyAccessContact[]>> => {
    const op = "webEmergencyAccessApiClient.trustedGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/trusted`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching trusted emergency contacts.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await webApiResponseParse(op, response, emergencyAccessListResponseSchema)
    if (!result.success) return result
    return resultCreate(result.data.data)
  }

  const grantedGet = async (accessToken: string): Promise<Result<EmergencyAccessContact[]>> => {
    const op = "webEmergencyAccessApiClient.grantedGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/granted`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching granted emergency contacts.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await webApiResponseParse(op, response, emergencyAccessListResponseSchema)
    if (!result.success) return result
    return resultCreate(result.data.data)
  }

  const invite = async (accessToken: string, payload: EmergencyAccessInviteRequest): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.invite"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/invite`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error inviting emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const reinvite = async (accessToken: string, id: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.reinvite"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/reinvite`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error resending invitation.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
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
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error updating emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, emergencyAccessContactSchema)
  }

  const confirm = async (accessToken: string, id: string, key: string): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.confirm"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/confirm`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify({ key }),
      })
    } catch {
      return resultErrorCreate(op, "Network error confirming emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, emergencyAccessContactSchema)
  }

  const accept = async (accessToken: string, id: string, token: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.accept"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/accept`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify({ token }),
      })
    } catch {
      return resultErrorCreate(op, "Network error accepting emergency contact invitation.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const deleteAccess = async (accessToken: string, id: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.deleteAccess"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting emergency contact.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const initiate = async (accessToken: string, id: string): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.initiate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/initiate`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error initiating emergency access recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, emergencyAccessContactSchema)
  }

  const approve = async (accessToken: string, id: string): Promise<Result<EmergencyAccessContact>> => {
    const op = "webEmergencyAccessApiClient.approve"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/approve`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error approving emergency access recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, emergencyAccessContactSchema)
  }

  const reject = async (accessToken: string, id: string): Promise<Result<void>> => {
    const op = "webEmergencyAccessApiClient.reject"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error rejecting emergency access recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const view = async (accessToken: string, id: string): Promise<Result<Record<string, unknown>[]>> => {
    const op = "webEmergencyAccessApiClient.view"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/view`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error viewing emergency vault items.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await webApiResponseParse(op, response, emergencyAccessViewResponseSchema)
    if (!result.success) return result
    return resultCreate(result.data.ciphers)
  }

  const takeover = async (
    accessToken: string,
    id: string,
  ): Promise<Result<v.InferOutput<typeof emergencyAccessTakeoverResponseSchema>>> => {
    const op = "webEmergencyAccessApiClient.takeover"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/emergency-access/${encodeURIComponent(id)}/takeover`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error initiating emergency takeover.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, emergencyAccessTakeoverResponseSchema)
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
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error updating grantor password during takeover.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
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
