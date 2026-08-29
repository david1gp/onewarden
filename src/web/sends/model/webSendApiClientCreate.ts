import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type SendAccessResponse, sendAccessResponseSchema } from "./sendAccessResponseSchema.js"
import type { SendCreateRequest } from "./sendCreateRequestSchema.js"
import { type SendItem, sendItemSchema } from "./sendItemSchema.js"
import type { SendUpdateRequest } from "./sendUpdateRequestSchema.js"

const sendListResponseSchema = v.object({
  data: v.array(sendItemSchema),
  object: v.literal("list"),
  continuationToken: v.nullable(v.unknown()),
})

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

export function webSendApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const baseUrl = options.baseUrl ?? ""
  const fetchImpl = options.fetch ?? fetch

  const sendList = async (accessToken: string): Promise<Result<SendItem[]>> => {
    const op = "webSendApiClient.sendList"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting send.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseEmptyParse(op, response)
  }

  const sendRemovePassword = async (accessToken: string, sendId: string): Promise<Result<SendItem>> => {
    const op = "webSendApiClient.sendRemovePassword"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/${encodeURIComponent(sendId)}/remove-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error removing send password.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return responseJsonParse(op, response, sendItemSchema)
  }

  const sendAccess = async (accessId: string, password?: string | null): Promise<Result<SendAccessResponse>> => {
    const op = "webSendApiClient.sendAccess"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sends/access/${encodeURIComponent(accessId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ password: password ?? null }),
      })
    } catch {
      return resultErrorCreate(op, "Network error accessing send.", {
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
          body: JSON.stringify({ password: password ?? null }),
        },
      )
    } catch {
      return resultErrorCreate(op, "Network error requesting file download url.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    }
    try {
      const json = (await response.json()) as { url: string }
      return resultCreate(json)
    } catch {
      return resultErrorCreate(op, "Invalid access file response JSON.")
    }
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
    sendAccessFile,
  }
}
