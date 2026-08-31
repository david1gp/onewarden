import * as v from "valibot"
import { type Result, type ResultErr } from "#result"
import { webApiAuthenticatedHeadersCreate } from "../../../shared/api/webApiAuthenticatedHeadersCreate.js"
import { webApiResponseEmptyParse } from "../../../shared/api/webApiResponseEmptyParse.js"
import { webApiResponseParse } from "../../../shared/api/webApiResponseParse.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type SendAccessResponse, sendAccessResponseSchema } from "./sendAccessResponseSchema.js"
import { sendAccessTokenErrorResponseSchema } from "./sendAccessTokenErrorResponseSchema.js"
import { sendAccessTokenResponseSchema } from "./sendAccessTokenResponseSchema.js"
import type { SendCreateRequest } from "./sendCreateRequestSchema.js"
import { type SendItem, sendItemSchema } from "./sendItemSchema.js"
import type { SendUpdateRequest } from "./sendUpdateRequestSchema.js"

const sendListResponseSchema = v.object({
  data: v.array(sendItemSchema),
  object: v.literal("list"),
  continuationToken: v.nullable(v.unknown()),
})

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function sendResponseErrorTransform(result: ResultErr, text: string): ResultErr {
  try {
    const parsed = v.safeParse(v.looseObject({ message: v.string() }), JSON.parse(text))
    if (parsed.success) return { ...result, errorMessage: parsed.output.message }
  } catch {
    // Fall through to the shared response parser.
  }
  return result
}

export function webSendApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const baseUrl = options.baseUrl ?? ""
  const fetchImpl = options.fetch ?? fetch

  const responseJsonParse = <TSchema extends v.GenericSchema>(
    op: string,
    response: Response,
    schema: TSchema,
  ): Promise<Result<v.InferOutput<TSchema>>> =>
    webApiResponseParse(op, response, schema, { errorResultTransform: sendResponseErrorTransform })

  const sendList = async (accessToken: string): Promise<Result<SendItem[]>> => {
    const op = "webSendApiClient.sendList"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching sends.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await responseJsonParse(op, response, sendListResponseSchema)
    if (!result.success) return result
    return resultCreate(result.data.data)
  }

  const sendGet = async (accessToken: string, sendId: string): Promise<Result<SendItem>> => {
    const op = "webSendApiClient.sendGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/${encodeURIComponent(sendId)}`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendItemSchema)
  }

  const sendCreate = async (accessToken: string, payload: SendCreateRequest): Promise<Result<SendItem>> => {
    const op = "webSendApiClient.sendCreate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error creating send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendItemSchema)
  }

  const sendFileCreate = async (
    accessToken: string,
    payload: SendCreateRequest,
    file: File | Blob,
    fileName: string,
  ): Promise<Result<SendItem>> => {
    const op = "webSendApiClient.sendFileCreate"
    let response: Response
    try {
      const formData = new FormData()
      formData.append("model", JSON.stringify(payload))
      formData.append("data", file, fileName)

      response = await fetchImpl(`${baseUrl}/api/sends/file`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
        body: formData,
      })
    } catch {
      return resultErrorCreate(op, "Network error uploading file send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendItemSchema)
  }

  const sendUpdate = async (
    accessToken: string,
    sendId: string,
    payload: SendUpdateRequest,
  ): Promise<Result<SendItem>> => {
    const op = "webSendApiClient.sendUpdate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/${encodeURIComponent(sendId)}`, {
        method: "PUT",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error updating send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendItemSchema)
  }

  const sendDelete = async (accessToken: string, sendId: string): Promise<Result<void>> => {
    const op = "webSendApiClient.sendDelete"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/${encodeURIComponent(sendId)}`, {
        method: "DELETE",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const sendRemovePassword = async (accessToken: string, sendId: string): Promise<Result<SendItem>> => {
    const op = "webSendApiClient.sendRemovePassword"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/${encodeURIComponent(sendId)}/remove-password`, {
        method: "PUT",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error removing send password.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendItemSchema)
  }

  const sendAccess = async (
    accessId: string,
    password?: string | null,
    email?: string | null,
    otp?: string | null,
  ): Promise<Result<SendAccessResponse>> => {
    const op = "webSendApiClient.sendAccess"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/access/${encodeURIComponent(accessId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email ?? null, otp: otp ?? null, password: password ?? null }),
      })
    } catch {
      return resultErrorCreate(op, "Network error accessing send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendAccessResponseSchema)
  }

  const sendAccessToken = async (
    accessId: string,
    email: string,
    otp?: string | null,
  ): Promise<Result<{ accessToken: string; expiresIn: number }>> => {
    const op = "webSendApiClient.sendAccessToken"
    let response: Response
    try {
      const body = new URLSearchParams({
        client_id: "send",
        email,
        grant_type: "send_access",
        scope: "api.send.access",
        send_id: accessId,
      })
      if (otp !== undefined && otp !== null) body.set("otp", otp)
      response = await fetchImpl(`${baseUrl}/identity/connect/token`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    } catch {
      return resultErrorCreate(op, "Network error requesting Send verification.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    const result = await responseJsonParse(op, response, sendAccessTokenResponseSchema)
    if (!result.success) {
      if (result.errorData !== undefined && result.errorData !== null) {
        try {
          const parsedError = v.safeParse(sendAccessTokenErrorResponseSchema, JSON.parse(result.errorData))
          if (parsedError.success) {
            return resultErrorCreate(op, parsedError.output.error_description, {
              code:
                result.statusCode === 404
                  ? "platform.not-found"
                  : result.statusCode === 429
                    ? "platform.rate-limited"
                    : result.statusCode === 500
                      ? "platform.internal"
                      : "platform.invalid-request",
              errorData: JSON.stringify({ sendAccessErrorType: parsedError.output.send_access_error_type }),
              statusCode: result.statusCode,
            })
          }
        } catch {
          // Fall through to the shared response parser.
        }
      }
      return result
    }
    return resultCreate({ accessToken: result.data.access_token, expiresIn: result.data.expires_in })
  }

  const sendAccessAuthenticated = async (accessToken: string): Promise<Result<SendAccessResponse>> => {
    const op = "webSendApiClient.sendAccessAuthenticated"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/access`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error accessing Send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendAccessResponseSchema)
  }

  const sendAccessFile = async (
    sendId: string,
    fileId: string,
    password?: string | null,
    email?: string | null,
    otp?: string | null,
  ): Promise<Result<{ url: string }>> => {
    const op = "webSendApiClient.sendAccessFile"
    let response: Response
    try {
      response = await fetchImpl(
        `${baseUrl}/api/sends/${encodeURIComponent(sendId)}/access/file/${encodeURIComponent(fileId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: email ?? null, otp: otp ?? null, password: password ?? null }),
        },
      )
    } catch {
      return resultErrorCreate(op, "Network error requesting file download url.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, v.object({ url: v.string() }))
  }

  const sendAccessFileAuthenticated = async (accessToken: string, fileId: string): Promise<Result<{ url: string }>> => {
    const op = "webSendApiClient.sendAccessFileAuthenticated"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/access/file/${encodeURIComponent(fileId)}`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error requesting file download url.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, v.object({ url: v.string() }))
  }

  return {
    sendList,
    sendGet,
    sendCreate,
    sendFileCreate,
    sendUpdate,
    sendDelete,
    sendRemovePassword,
    sendAccess,
    sendAccessToken,
    sendAccessAuthenticated,
    sendAccessFile,
    sendAccessFileAuthenticated,
  }
}
