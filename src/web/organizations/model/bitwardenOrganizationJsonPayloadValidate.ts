import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import {
  type BitwardenOrganizationJsonPayload,
  bitwardenOrganizationJsonPayloadSchema,
} from "./bitwardenOrganizationJsonPayloadSchema.js"

export interface BitwardenOrganizationJsonPayloadValidateOptions {
  organizationId?: string
}

function organizationIdRead(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function organizationJsonPayloadReferencesValidate(
  payload: BitwardenOrganizationJsonPayload,
  rawPayload: Record<string, unknown>,
  options: BitwardenOrganizationJsonPayloadValidateOptions,
): string | null {
  const collectionIds = new Set<string>()
  for (const [index, collection] of payload.collections.entries()) {
    if (collectionIds.has(collection.id)) return `duplicate collection id '${collection.id}'`
    collectionIds.add(collection.id)

    const rawCollection = Array.isArray(rawPayload.collections) ? rawPayload.collections[index] : undefined
    if (typeof rawCollection === "object" && rawCollection !== null && "organizationId" in rawCollection) {
      const organizationId = (rawCollection as Record<string, unknown>).organizationId
      if (organizationId !== null && organizationIdRead(organizationId) === null)
        return `collection at index ${index} has an invalid organization id`
    }
  }

  const organizationIds = new Set<string>()
  for (const [index, item] of payload.items.entries()) {
    const rawItem = Array.isArray(rawPayload.items) ? rawPayload.items[index] : undefined
    if (typeof rawItem === "object" && rawItem !== null) {
      const rawRecord = rawItem as Record<string, unknown>
      if ("folderId" in rawRecord) return `item at index ${index} contains individual folder data`
      if ("organizationId" in rawRecord) {
        if (rawRecord.organizationId !== null && organizationIdRead(rawRecord.organizationId) === null)
          return `item at index ${index} has an invalid organization id`
        const organizationId = organizationIdRead(rawRecord.organizationId)
        if (organizationId !== null) organizationIds.add(organizationId)
      }
    }

    const itemCollectionIds = item.collectionIds
    if (itemCollectionIds === undefined || itemCollectionIds === null || itemCollectionIds.length === 0)
      return `item at index ${index} must reference at least one collection`
    const itemReferenceIds = new Set<string>()
    for (const collectionId of itemCollectionIds) {
      if (collectionId.length === 0) return `item at index ${index} contains an empty collection reference`
      if (itemReferenceIds.has(collectionId)) return `item at index ${index} contains a duplicate collection reference`
      if (!collectionIds.has(collectionId))
        return `item at index ${index} references missing collection '${collectionId}'`
      itemReferenceIds.add(collectionId)
    }
  }

  for (const collection of payload.collections) {
    if (collection.organizationId !== undefined && collection.organizationId !== null)
      organizationIds.add(collection.organizationId)
  }

  if (options.organizationId !== undefined) {
    if (options.organizationId.length === 0) return "organization id must not be empty"
    for (const collection of payload.collections) {
      if (collection.organizationId !== options.organizationId)
        return `collection '${collection.id}' belongs to a different organization`
    }
    for (const [index, item] of payload.items.entries()) {
      if (item.organizationId !== options.organizationId)
        return `item at index ${index} belongs to a different organization`
    }
    return null
  }

  if (organizationIds.size > 1) return "organization data contains mismatched organization ids"
  return null
}

export function bitwardenOrganizationJsonPayloadValidate(
  input: unknown,
  options: BitwardenOrganizationJsonPayloadValidateOptions = {},
): Result<BitwardenOrganizationJsonPayload> {
  const op = "bitwardenOrganizationJsonPayloadValidate"
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return resultErrorCreate(op, "Invalid Bitwarden organization JSON: payload must be an object.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const rawPayload = input as Record<string, unknown>
  if ("folders" in rawPayload)
    return resultErrorCreate(op, "Invalid Bitwarden organization JSON: individual folders are not supported.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const parsed = v.safeParse(bitwardenOrganizationJsonPayloadSchema, input)
  if (!parsed.success)
    return resultErrorCreate(op, `Invalid Bitwarden organization JSON: ${v.summarize(parsed.issues)}`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const referenceError = organizationJsonPayloadReferencesValidate(parsed.output, rawPayload, options)
  if (referenceError !== null)
    return resultErrorCreate(op, `Invalid Bitwarden organization JSON: ${referenceError}.`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  return resultCreate(parsed.output)
}
