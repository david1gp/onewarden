import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import { bitwardenApiRoutes } from "../../shared/api/bitwardenApiRoutes.js"
import {
  type BitwardenAttachmentDeleteResponse,
  bitwardenAttachmentDeleteResponseSchema,
} from "../../shared/api/bitwardenAttachmentDeleteResponseSchema.js"
import { bitwardenCollectionListResponseSchema } from "../../shared/api/bitwardenCollectionListResponseSchema.js"
import {
  type BitwardenCollectionMutationRequest,
  bitwardenCollectionMutationRequestSchema,
} from "../../shared/api/bitwardenCollectionMutationRequestSchema.js"
import {
  type BitwardenEncryptedCipherListResponse,
  bitwardenEncryptedCipherListResponseSchema,
} from "../../shared/api/bitwardenEncryptedCipherListResponseSchema.js"
import {
  type BitwardenEncryptedCipherMutationRequest,
  bitwardenEncryptedCipherMutationRequestSchema,
} from "../../shared/api/bitwardenEncryptedCipherMutationRequestSchema.js"
import {
  type BitwardenEncryptedCipherResponse,
  bitwardenEncryptedCipherResponseSchema,
} from "../../shared/api/bitwardenEncryptedCipherResponseSchema.js"
import { bitwardenEncryptedCollectionSchema } from "../../shared/api/bitwardenEncryptedCollectionSchema.js"
import { bitwardenEncryptedFolderSchema } from "../../shared/api/bitwardenEncryptedFolderSchema.js"
import { bitwardenFolderListResponseSchema } from "../../shared/api/bitwardenFolderListResponseSchema.js"
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
import { webApiResponseEmptyParse } from "../../shared/api/webApiResponseEmptyParse.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import {
  type SessionHandoffCreateRequest,
  sessionHandoffCreateRequestSchema,
} from "../../shared/sessionHandoff/sessionHandoffCreateRequestSchema.js"
import {
  type SessionHandoffCreateResponse,
  sessionHandoffCreateResponseSchema,
} from "../../shared/sessionHandoff/sessionHandoffCreateResponseSchema.js"
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
    body = JSON.parse(text)
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

    sessionHandoffCreate(
      request: ProtectedRequest & SessionHandoffCreateRequest,
    ): Promise<Result<SessionHandoffCreateResponse>> {
      const op = "extensionBitwardenApiClient.sessionHandoffCreate"
      const { accessToken, ...handoffRequest } = request
      const handoffResult = requestValidationParse(op, handoffRequest, sessionHandoffCreateRequestSchema)
      if (!handoffResult.success) return Promise.resolve(handoffResult)
      if (typeof accessToken !== "string" || accessToken.length === 0) {
        return Promise.resolve(
          resultErrorCreate(op, "Authentication is required.", {
            code: "platform.unauthorized",
            statusCode: 401,
          }),
        )
      }
      const bodyResult = jsonBodyCreate(op, handoffResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, "/extension/handoffs"),
        op,
        {
          method: "POST",
          headers: { ...protectedHeaders(accessToken), "content-type": "application/json" },
          body: bodyResult.data,
        },
        sessionHandoffCreateResponseSchema,
      )
    },

    cipherList(request: ProtectedRequest): Promise<Result<BitwardenEncryptedCipherListResponse>> {
      const op = "extensionBitwardenApiClient.cipherList"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.cipherList.path)),
        op,
        {
          method: "GET",
          headers: protectedHeaders(request.accessToken),
        },
        bitwardenEncryptedCipherListResponseSchema,
      )
    },

    cipherRead(cipherId: string, request: ProtectedRequest): Promise<Result<BitwardenEncryptedCipherResponse>> {
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
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    cipherCreate(
      cipher: BitwardenEncryptedCipherMutationRequest,
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherCreate"
      const requestResult = requestValidationParse(op, cipher, bitwardenEncryptedCipherMutationRequestSchema)
      if (!requestResult.success) return Promise.resolve(requestResult)
      const collectionIds = requestResult.data.collectionIds
      const organizationId = requestResult.data.organizationId ?? requestResult.data.organizationID
      const wrapped = organizationId !== undefined && organizationId !== null
      const hasCollections = collectionIds !== undefined && collectionIds !== null && collectionIds.length > 0
      const body =
        wrapped || hasCollections
          ? {
              cipher: requestResult.data,
              ...(collectionIds === undefined || collectionIds === null ? {} : { collectionIds }),
            }
          : requestResult.data
      const bodyResult = jsonBodyCreate(op, body)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(
            wrapped || hasCollections
              ? bitwardenApiRoutes.cipherCreateWrapped.path
              : bitwardenApiRoutes.cipherCreate.path,
          ),
        ),
        op,
        {
          method: "POST",
          headers: jsonHeadersWithAuthorization(request.accessToken),
          body: bodyResult.data,
        },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    cipherUpdate(
      cipherId: string,
      cipher: BitwardenEncryptedCipherMutationRequest,
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherUpdate"
      const requestResult = requestValidationParse(op, cipher, bitwardenEncryptedCipherMutationRequestSchema)
      if (!requestResult.success) return Promise.resolve(requestResult)
      const bodyResult = jsonBodyCreate(op, requestResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.cipherUpdate.path.replace(":cipher_id", encodeURIComponent(cipherId))),
        ),
        op,
        {
          method: "PUT",
          headers: jsonHeadersWithAuthorization(request.accessToken),
          body: bodyResult.data,
        },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    cipherPartial(
      cipherId: string,
      partial: { favorite?: boolean; folderId?: string | null },
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherPartial"
      const requestResult = requestValidationParse(
        op,
        partial,
        v.pipe(
          v.strictObject({ favorite: v.optional(v.boolean()), folderId: v.optional(v.nullable(v.string())) }),
          v.check(
            (value) => value.favorite !== undefined || value.folderId !== undefined,
            "At least one partial cipher field is required.",
          ),
        ),
      )
      if (!requestResult.success) return Promise.resolve(requestResult)
      const bodyResult = jsonBodyCreate(op, requestResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.cipherPartial.path.replace(":cipher_id", encodeURIComponent(cipherId))),
        ),
        op,
        { method: "PUT", headers: jsonHeadersWithAuthorization(request.accessToken), body: bodyResult.data },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    cipherDelete(cipherId: string, hard: boolean, request: ProtectedRequest): Promise<Result<void>> {
      const op = "extensionBitwardenApiClient.cipherDelete"
      const route = hard ? bitwardenApiRoutes.cipherHardDelete : bitwardenApiRoutes.cipherDelete
      return emptyRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(route.path.replace(":cipher_id", encodeURIComponent(cipherId)))),
        op,
        { method: route.method, headers: protectedHeaders(request.accessToken) },
      )
    },

    cipherRestore(cipherId: string, request: ProtectedRequest): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherRestore"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.cipherRestore.path.replace(":cipher_id", encodeURIComponent(cipherId))),
        ),
        op,
        { method: "PUT", headers: protectedHeaders(request.accessToken) },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    cipherArchive(
      cipherId: string,
      archived: boolean,
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherArchive"
      const route = archived ? bitwardenApiRoutes.cipherArchive : bitwardenApiRoutes.cipherUnarchive
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(route.path.replace(":cipher_id", encodeURIComponent(cipherId)))),
        op,
        { method: "PUT", headers: protectedHeaders(request.accessToken) },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    cipherMove(ids: string[], folderId: string | null, request: ProtectedRequest): Promise<Result<void>> {
      const op = "extensionBitwardenApiClient.cipherMove"
      const bodyResult = jsonBodyCreate(op, { ids, folderId })
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return emptyRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.cipherMove.path)),
        op,
        { method: "POST", headers: jsonHeadersWithAuthorization(request.accessToken), body: bodyResult.data },
      )
    },

    cipherCollectionsUpdate(
      cipherId: string,
      collectionIds: string[],
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.cipherCollectionsUpdate"
      const bodyResult = jsonBodyCreate(op, { collectionIds })
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(
            bitwardenApiRoutes.cipherCollections.path.replace(":cipher_id", encodeURIComponent(cipherId)),
          ),
        ),
        op,
        { method: "PUT", headers: jsonHeadersWithAuthorization(request.accessToken), body: bodyResult.data },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    attachmentUpload(
      cipherId: string,
      data: Uint8Array,
      fileName: string,
      key: string,
      request: ProtectedRequest,
    ): Promise<Result<BitwardenEncryptedCipherResponse>> {
      const op = "extensionBitwardenApiClient.attachmentUpload"
      const formData = new FormData()
      formData.append("data", new Blob([new Uint8Array(data)]), fileName)
      formData.append("key", key)
      const path = bitwardenApiRoutes.attachmentUpload.path.replace(":cipher_id", encodeURIComponent(cipherId))
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(path)),
        op,
        { method: "POST", headers: protectedHeaders(request.accessToken), body: formData },
        bitwardenEncryptedCipherResponseSchema,
      )
    },

    async attachmentDownload(
      cipherId: string,
      attachmentId: string,
      request: ProtectedRequest,
    ): Promise<Result<Uint8Array>> {
      const op = "extensionBitwardenApiClient.attachmentDownload"
      const path = bitwardenApiRoutes.attachmentDownload.path
        .replace(":cipher_id", encodeURIComponent(cipherId))
        .replace(":attachment_id", encodeURIComponent(attachmentId))
      let response: Response
      try {
        response = await fetchImplementation(apiUrlCreate(environment, apiRoutePathRead(path)), {
          method: "GET",
          headers: protectedHeaders(request.accessToken),
        })
      } catch {
        return resultErrorCreate(op, "Attachment download failed.", {
          code: "platform.unavailable",
          statusCode: 503,
        })
      }
      if (!response.ok) {
        let text = ""
        try {
          text = await response.text()
        } catch {
          return resultErrorCreate(op, "Attachment error response could not be read.", {
            code: "platform.unavailable",
            statusCode: 503,
          })
        }
        return resultTryParsingFetchErr(op, text, response.status, response.statusText)
      }
      try {
        return resultCreate(new Uint8Array(await response.arrayBuffer()))
      } catch {
        return resultErrorCreate(op, "Attachment data could not be read.", {
          code: "platform.unavailable",
          statusCode: 503,
        })
      }
    },

    attachmentDelete(
      cipherId: string,
      attachmentId: string,
      request: ProtectedRequest,
    ): Promise<Result<BitwardenAttachmentDeleteResponse>> {
      const op = "extensionBitwardenApiClient.attachmentDelete"
      const path = bitwardenApiRoutes.attachmentDelete.path
        .replace(":cipher_id", encodeURIComponent(cipherId))
        .replace(":attachment_id", encodeURIComponent(attachmentId))
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(path)),
        op,
        { method: "DELETE", headers: protectedHeaders(request.accessToken) },
        bitwardenAttachmentDeleteResponseSchema,
      )
    },

    folderList(request: ProtectedRequest) {
      const op = "extensionBitwardenApiClient.folderList"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.folderList.path)),
        op,
        { method: "GET", headers: protectedHeaders(request.accessToken) },
        bitwardenFolderListResponseSchema,
      )
    },

    folderRead(folderId: string, request: ProtectedRequest) {
      const op = "extensionBitwardenApiClient.folderRead"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.folderRead.path.replace(":folder_id", encodeURIComponent(folderId))),
        ),
        op,
        { method: "GET", headers: protectedHeaders(request.accessToken) },
        bitwardenEncryptedFolderSchema,
      )
    },

    folderCreate(folder: { id?: string | null; name: string }, request: ProtectedRequest) {
      const op = "extensionBitwardenApiClient.folderCreate"
      const requestResult = requestValidationParse(
        op,
        folder,
        v.looseObject({ id: v.optional(v.nullable(v.string())), name: v.string() }),
      )
      if (!requestResult.success) return Promise.resolve(requestResult)
      const bodyResult = jsonBodyCreate(op, requestResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.folderCreate.path)),
        op,
        { method: "POST", headers: jsonHeadersWithAuthorization(request.accessToken), body: bodyResult.data },
        bitwardenEncryptedFolderSchema,
      )
    },

    folderUpdate(folderId: string, folder: { id?: string | null; name: string }, request: ProtectedRequest) {
      const op = "extensionBitwardenApiClient.folderUpdate"
      const requestResult = requestValidationParse(
        op,
        folder,
        v.looseObject({ id: v.optional(v.nullable(v.string())), name: v.string() }),
      )
      if (!requestResult.success) return Promise.resolve(requestResult)
      const bodyResult = jsonBodyCreate(op, requestResult.data)
      if (!bodyResult.success) return Promise.resolve(bodyResult)
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.folderUpdate.path.replace(":folder_id", encodeURIComponent(folderId))),
        ),
        op,
        { method: "PUT", headers: jsonHeadersWithAuthorization(request.accessToken), body: bodyResult.data },
        bitwardenEncryptedFolderSchema,
      )
    },

    folderDelete(folderId: string, request: ProtectedRequest): Promise<Result<void>> {
      const op = "extensionBitwardenApiClient.folderDelete"
      return emptyRequest(
        fetchImplementation,
        apiUrlCreate(
          environment,
          apiRoutePathRead(bitwardenApiRoutes.folderDelete.path.replace(":folder_id", encodeURIComponent(folderId))),
        ),
        op,
        { method: "DELETE", headers: protectedHeaders(request.accessToken) },
      )
    },

    collectionList(request: ProtectedRequest) {
      const op = "extensionBitwardenApiClient.collectionList"
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(bitwardenApiRoutes.collectionList.path)),
        op,
        { method: "GET", headers: protectedHeaders(request.accessToken) },
        bitwardenCollectionListResponseSchema,
      )
    },

    collectionRead(organizationId: string, collectionId: string, request: ProtectedRequest) {
      const op = "extensionBitwardenApiClient.collectionRead"
      const path = bitwardenApiRoutes.collectionRead.path
        .replace(":org_id", encodeURIComponent(organizationId))
        .replace(":col_id", encodeURIComponent(collectionId))
      return jsonRequest(
        fetchImplementation,
        apiUrlCreate(environment, apiRoutePathRead(path)),
        op,
        { method: "GET", headers: protectedHeaders(request.accessToken) },
        bitwardenEncryptedCollectionSchema,
      )
    },

    collectionCreate(
      organizationId: string,
      collection: BitwardenCollectionMutationRequest,
      request: ProtectedRequest,
    ) {
      const op = "extensionBitwardenApiClient.collectionCreate"
      return collectionMutationRequest(
        fetchImplementation,
        environment,
        bitwardenApiRoutes.collectionCreate,
        organizationId,
        null,
        collection,
        request,
        op,
      )
    },

    collectionUpdate(
      organizationId: string,
      collectionId: string,
      collection: BitwardenCollectionMutationRequest,
      request: ProtectedRequest,
    ) {
      const op = "extensionBitwardenApiClient.collectionUpdate"
      return collectionMutationRequest(
        fetchImplementation,
        environment,
        bitwardenApiRoutes.collectionUpdate,
        organizationId,
        collectionId,
        collection,
        request,
        op,
      )
    },

    collectionDelete(organizationId: string, collectionId: string, request: ProtectedRequest): Promise<Result<void>> {
      const op = "extensionBitwardenApiClient.collectionDelete"
      const path = bitwardenApiRoutes.collectionDelete.path
        .replace(":org_id", encodeURIComponent(organizationId))
        .replace(":col_id", encodeURIComponent(collectionId))
      return emptyRequest(fetchImplementation, apiUrlCreate(environment, apiRoutePathRead(path)), op, {
        method: "DELETE",
        headers: protectedHeaders(request.accessToken),
      })
    },
  }
}

async function emptyRequest(
  fetchImplementation: FetchImplementation,
  url: string,
  op: string,
  init: RequestInit,
): Promise<Result<void>> {
  let response: Response
  try {
    response = await fetchImplementation(url, init)
  } catch {
    return resultErrorCreate(op, "Bitwarden request failed.", { code: "platform.unavailable", statusCode: 503 })
  }
  return webApiResponseEmptyParse(op, response)
}

async function collectionMutationRequest(
  fetchImplementation: FetchImplementation,
  environment: ExtensionEnvironment,
  route: { path: string; method: string },
  organizationId: string,
  collectionId: string | null,
  collection: BitwardenCollectionMutationRequest,
  request: ProtectedRequest,
  op: string,
): Promise<Result<v.InferOutput<typeof bitwardenEncryptedCollectionSchema>>> {
  const requestResult = requestValidationParse(op, collection, bitwardenCollectionMutationRequestSchema)
  if (!requestResult.success) return requestResult
  const bodyResult = jsonBodyCreate(op, requestResult.data)
  if (!bodyResult.success) return bodyResult
  const path = route.path
    .replace(":org_id", encodeURIComponent(organizationId))
    .replace(":col_id", collectionId === null ? "" : encodeURIComponent(collectionId))
  return jsonRequest(
    fetchImplementation,
    `${environment.api}${apiRoutePathRead(path)}`,
    op,
    { method: route.method, headers: jsonHeadersWithAuthorization(request.accessToken), body: bodyResult.data },
    bitwardenEncryptedCollectionSchema,
  )
}

function jsonHeadersWithAuthorization(accessToken: string): HeadersInit {
  return { ...jsonHeaders, authorization: `Bearer ${accessToken}` }
}
