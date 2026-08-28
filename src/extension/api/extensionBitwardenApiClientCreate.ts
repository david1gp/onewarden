import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import { bitwardenApiRoutes } from "../../shared/api/bitwardenApiRoutes.js"
import {
  type BitwardenEncryptedLoginCipherCreateRequest,
  bitwardenEncryptedLoginCipherCreateRequestSchema,
} from "../../shared/api/bitwardenEncryptedLoginCipherCreateRequestSchema.js"
import {
  type BitwardenEncryptedLoginCipherListResponse,
  bitwardenEncryptedLoginCipherListResponseSchema,
} from "../../shared/api/bitwardenEncryptedLoginCipherListResponseSchema.js"
import {
  type BitwardenEncryptedLoginCipherResponse,
  bitwardenEncryptedLoginCipherResponseSchema,
} from "../../shared/api/bitwardenEncryptedLoginCipherResponseSchema.js"
import {
  type BitwardenPasswordTokenRequest,
  bitwardenPasswordTokenRequestSchema,
} from "../../shared/api/bitwardenPasswordTokenRequestSchema.js"
import {
  type BitwardenPasswordTokenResponse,
  bitwardenPasswordTokenResponseSchema,
} from "../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import {
  type BitwardenPreloginRequest,
  bitwardenPreloginRequestSchema,
} from "../../shared/api/bitwardenPreloginRequestSchema.js"
import {
  type BitwardenPreloginResponse,
  bitwardenPreloginResponseSchema,
} from "../../shared/api/bitwardenPreloginResponseSchema.js"
import {
  type BitwardenRefreshTokenRequest,
  bitwardenRefreshTokenRequestSchema,
} from "../../shared/api/bitwardenRefreshTokenRequestSchema.js"
import {
  type BitwardenRefreshTokenResponse,
  bitwardenRefreshTokenResponseSchema,
} from "../../shared/api/bitwardenRefreshTokenResponseSchema.js"
import {
  type BitwardenRevisionDateResponse,
  bitwardenRevisionDateResponseSchema,
} from "../../shared/api/bitwardenRevisionDateResponseSchema.js"
import {
  type BitwardenSyncEnvelope,
  bitwardenSyncEnvelopeSchema,
} from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { ExtensionEnvironment } from "./extensionEnvironmentSchema.js"

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type ProtectedRequest = {
  accessToken: string
}

const jsonHeaders = { accept: "application/json", "content-type": "application/json" }

function apiUrlCreate(environment: ExtensionEnvironment, path: string): string {
  return `${environment.api}${path}`
}

function identityUrlCreate(environment: ExtensionEnvironment, path: string): string {
  return `${environment.identity}${path}`
}

function apiRoutePathRead(path: string): string {
  return path.replace(/^\/api/, "")
}

function identityRoutePathRead(path: string): string {
  return path.replace(/^\/identity/, "")
}

function protectedHeaders(accessToken: string): HeadersInit {
  return { accept: "application/json", authorization: `Bearer ${accessToken}` }
}

function requestValidationParse<TSchema extends v.GenericSchema>(
  op: string,
  input: unknown,
  schema: TSchema,
): Result<v.InferOutput<TSchema>> {
  const parsed = v.safeParse(schema, input)
  if (parsed.success) return resultCreate(parsed.output)
  return resultErrorCreate(op, v.summarize(parsed.issues), { code: "platform.invalid-request", statusCode: 400 })
}

async function responseJsonParse<TSchema extends v.GenericSchema>(
  op: string,
  response: Response,
  schema: TSchema,
): Promise<Result<v.InferOutput<TSchema>>> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return resultErrorCreate(op, "Bitwarden response could not be read.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }
  if (!response.ok) return resultTryParsingFetchErr(op, text, response.status, response.statusText)

  let body: unknown
  try {
    body = JSON.parse(text) as unknown
  } catch {
    return resultErrorCreate(op, "Bitwarden response was not valid JSON.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  const parsed = v.safeParse(schema, body)
  if (!parsed.success) {
    return resultErrorCreate(op, "Bitwarden response did not match its contract.", {
      code: "platform.internal",
      statusCode: 500,
      errorData: v.summarize(parsed.issues),
    })
  }
  return resultCreate(parsed.output)
}

async function jsonRequest<TSchema extends v.GenericSchema>(
  fetchImplementation: FetchImplementation,
  url: string,
  op: string,
  init: RequestInit,
  schema: TSchema,
): Promise<Result<v.InferOutput<TSchema>>> {
  let response: Response
  try {
    response = await fetchImplementation(url, init)
  } catch {
    return resultErrorCreate(op, "Bitwarden request failed.", { code: "platform.unavailable", statusCode: 503 })
  }
  return responseJsonParse(op, response, schema)
}

function tokenBodyCreate(request: BitwardenPasswordTokenRequest | BitwardenRefreshTokenRequest): string {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(request)) {
    if (typeof value === "string") body.set(key, value)
  }
  return body.toString()
}

function jsonBodyCreate(op: string, input: unknown): Result<string> {
  try {
    return resultCreate(JSON.stringify(input))
  } catch {
    return resultErrorCreate(op, "Bitwarden request could not be encoded.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}

export function extensionBitwardenApiClientCreate(
  environment: ExtensionEnvironment,
  options: { fetch?: FetchImplementation } = {},
) {
  const fetchImplementation = options.fetch ?? globalThis.fetch

  return {
    prelogin(request: BitwardenPreloginRequest): Promise<Result<BitwardenPreloginResponse>> {
      const op = "extensionBitwardenApiClient.prelogin"
      const requestResult = requestValidationParse(op, request, bitwardenPreloginRequestSchema)
      if (!requestResult.success) return Promise.resolve(requestResult)
      const bodyResult = jsonBodyCreate(op, requestResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        identityUrlCreate(
          environment,
          identityRoutePathRead(bitwardenApiRoutes.prelogin.paths[1] ?? "/identity/accounts/prelogin"),
        ),
        op,
        {
          method: "POST",
          headers: jsonHeaders,
          body: bodyResult.data,
        },
        bitwardenPreloginResponseSchema,
      )
    },

    passwordToken(request: BitwardenPasswordTokenRequest): Promise<Result<BitwardenPasswordTokenResponse>> {
      const op = "extensionBitwardenApiClient.passwordToken"
      const requestResult = requestValidationParse(op, request, bitwardenPasswordTokenRequestSchema)
      if (!requestResult.success) return Promise.resolve(requestResult)
      return jsonRequest(
        fetchImplementation,
        identityUrlCreate(environment, identityRoutePathRead(bitwardenApiRoutes.token.path)),
        op,
        {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
          body: tokenBodyCreate(requestResult.data),
        },
        bitwardenPasswordTokenResponseSchema,
      )
    },

    refreshToken(request: BitwardenRefreshTokenRequest): Promise<Result<BitwardenRefreshTokenResponse>> {
      const op = "extensionBitwardenApiClient.refreshToken"
      const requestResult = requestValidationParse(op, request, bitwardenRefreshTokenRequestSchema)
      if (!requestResult.success) return Promise.resolve(requestResult)
      return jsonRequest(
        fetchImplementation,
        identityUrlCreate(environment, identityRoutePathRead(bitwardenApiRoutes.token.path)),
        op,
        {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
          body: tokenBodyCreate(requestResult.data),
        },
        bitwardenRefreshTokenResponseSchema,
      )
    },

    revisionDate(request: ProtectedRequest): Promise<Result<BitwardenRevisionDateResponse>> {
      const op = "extensionBitwardenApiClient.revisionDate"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.revisionDate.path)),
        op,
        {
          method: "GET",
          headers: protectedHeaders(request.accessToken),
        },
        bitwardenRevisionDateResponseSchema,
      )
    },

    sync(request: ProtectedRequest): Promise<Result<BitwardenSyncEnvelope>> {
      const op = "extensionBitwardenApiClient.sync"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.sync.path)),
        op,
        {
          method: "GET",
          headers: protectedHeaders(request.accessToken),
        },
        bitwardenSyncEnvelopeSchema,
      )
    },

    cipherList(request: ProtectedRequest): Promise<Result<BitwardenEncryptedLoginCipherListResponse>> {
      const op = "extensionBitwardenApiClient.cipherList"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.cipherList.path)),
        op,
        {
          method: "GET",
          headers: protectedHeaders(request.accessToken),
        },
        bitwardenEncryptedLoginCipherListResponseSchema,
      )
    },

    cipherRead(cipherId: string, request: ProtectedRequest): Promise<Result<BitwardenEncryptedLoginCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherRead"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.cipherRead.path.replace(":cipher_id", encodeURIComponent(cipherId))),
        ),
        op,
        {
          method: "GET",
          headers: protectedHeaders(request.accessToken),
        },
        bitwardenEncryptedLoginCipherResponseSchema,
      )
    },

    cipherCreate(
      cipher: BitwardenEncryptedLoginCipherCreateRequest,
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedLoginCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherCreate"
      const requestResult = requestValidationParse(op, cipher, bitwardenEncryptedLoginCipherCreateRequestSchema)
      if (!requestResult.success) return Promise.resolve(requestResult)
      const bodyResult = jsonBodyCreate(op, requestResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.cipherCreate.path)),
        op,
        {
          method: "POST",
          headers: jsonHeadersWithAuthorization(request.accessToken),
          body: bodyResult.data,
        },
        bitwardenEncryptedLoginCipherResponseSchema,
      )
    },
  }
}

function jsonHeadersWithAuthorization(accessToken: string): HeadersInit {
  return { ...jsonHeaders, authorization: `Bearer ${accessToken}` }
}
