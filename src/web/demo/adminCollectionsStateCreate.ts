import { createMemo } from "solid-js"
import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminOrganization } from "../admin/adminOrganizationSchema.js"
import type { OrganizationCollectionAccess } from "../organizations/schemas/organizationCollectionAccessSchema.js"
import {
  type OrganizationCollectionInput,
  organizationCollectionInputSchema,
} from "../organizations/schemas/organizationCollectionInputSchema.js"
import type { OrganizationCollection } from "../organizations/schemas/organizationCollectionSchema.js"
import { adminCollectionsDemoData } from "./adminCollectionsDemoData.js"
import { adminOrganizationsDemoData } from "./adminOrganizationsDemoData.js"

interface AdminCollectionsStateCreateProps {
  organizations?: SignalObject<readonly AdminOrganization[]>
  collections?: Readonly<Record<string, readonly OrganizationCollection[]>>
}

type AdminCollectionMap = Record<string, OrganizationCollection[]>

function adminCollectionMapCreate(
  collections: Readonly<Record<string, readonly OrganizationCollection[]>>,
): AdminCollectionMap {
  return Object.fromEntries(
    Object.entries(collections).map(([organizationId, organizationCollections]) => [
      organizationId,
      organizationCollections.map((collection) => ({
        ...collection,
        groups: collection.groups?.map((group) => ({ ...group })),
        users: collection.users?.map((user) => ({ ...user })),
      })),
    ]),
  )
}

function adminCollectionInputNormalize(input: OrganizationCollectionInput): Result<OrganizationCollectionInput> {
  const op = "adminCollectionInputNormalize"
  const normalizedInput = {
    ...input,
    ...(input.externalId === undefined ? {} : { externalId: input.externalId?.trim() || null }),
    name: input.name.trim(),
  }
  const parsed = v.safeParse(organizationCollectionInputSchema, normalizedInput)
  if (!parsed.success) return createResultError(op, "Collection input is invalid.", v.summarize(parsed.issues))
  return createResult(parsed.output)
}

function adminCollectionIdCreate(organizationId: string, collections: readonly OrganizationCollection[]): string {
  let sequence = collections.length + 1
  let id = `collection-${organizationId}-${String(sequence).padStart(3, "0")}`
  while (collections.some((collection) => collection.id === id)) {
    sequence += 1
    id = `collection-${organizationId}-${String(sequence).padStart(3, "0")}`
  }
  return id
}

function adminCollectionUsersMerge(
  currentUsers: readonly OrganizationCollectionAccess[] | undefined,
  nextUsers: readonly OrganizationCollectionAccess[] | undefined,
): OrganizationCollectionAccess[] | undefined {
  if (nextUsers === undefined) return currentUsers?.map((user) => ({ ...user }))
  const currentUsersById = new Map((currentUsers ?? []).map((user) => [user.id, user]))
  return nextUsers.map((user) => ({ ...currentUsersById.get(user.id), ...user }))
}

export function adminCollectionsStateCreate(props: AdminCollectionsStateCreateProps = {}) {
  const organizations =
    props.organizations ?? createSignalObject<readonly AdminOrganization[]>([...adminOrganizationsDemoData])
  const collectionsByOrganizationSignal = createSignalObject<AdminCollectionMap>(
    adminCollectionMapCreate(props.collections ?? adminCollectionsDemoData),
  )
  const selectedOrganizationIdSignal = createSignalObject<string | null>(organizations.get()[0]?.id ?? null)
  const selectedCollectionIdSignal = createSignalObject<string | null>(null)
  const searchQuerySignal = createSignalObject("")

  const selectedOrganization = createMemo(() => {
    const selectedId = selectedOrganizationIdSignal.get()
    if (selectedId) {
      const selected = organizations.get().find((organization) => organization.id === selectedId)
      if (selected) return selected
    }
    return organizations.get()[0] ?? null
  })

  const collections = createMemo(() => {
    const organizationId = selectedOrganization()?.id
    return organizationId ? (collectionsByOrganizationSignal.get()[organizationId] ?? []) : []
  })

  const selectedCollection = createMemo(() => {
    const selectedId = selectedCollectionIdSignal.get()
    return collections().find((collection) => collection.id === selectedId) ?? collections()[0] ?? null
  })

  const filteredCollections = createMemo(() => {
    const query = searchQuerySignal.get().trim().toLowerCase()
    if (!query) return collections()
    return collections().filter(
      (collection) =>
        collection.name.toLowerCase().includes(query) ||
        (collection.externalId?.toLowerCase().includes(query) ?? false),
    )
  })

  const selectedCollectionId = createMemo(() => selectedCollection()?.id ?? null)

  const collectionCount = (organizationId = selectedOrganization()?.id) =>
    organizationId ? (collectionsByOrganizationSignal.get()[organizationId]?.length ?? 0) : 0

  const organizationCollectionCountsSync = () => {
    const nextOrganizations = organizations.get().map((organization) => {
      const nextCount = collectionCount(organization.id)
      return organization.collectionCount === nextCount ? organization : { ...organization, collectionCount: nextCount }
    })
    if (nextOrganizations.some((organization, index) => organization !== organizations.get()[index])) {
      organizations.set(nextOrganizations)
    }
  }

  const collectionMapSet = (nextMap: AdminCollectionMap) => {
    collectionsByOrganizationSignal.set(nextMap)
    organizationCollectionCountsSync()
  }

  const selectOrganization = (organizationId: string | null): Result<void> => {
    const op = "adminCollectionsSelectOrganization"
    if (organizationId !== null && !organizations.get().some((organization) => organization.id === organizationId)) {
      return createResultError(op, `Organization ${organizationId} was not found.`)
    }
    selectedOrganizationIdSignal.set(organizationId)
    searchQuerySignal.set("")
    const nextOrganizationId = organizationId ?? organizations.get()[0]?.id ?? null
    selectedCollectionIdSignal.set(collectionsByOrganizationSignal.get()[nextOrganizationId ?? ""]?.[0]?.id ?? null)
    return createResult(undefined)
  }

  const setSearchQuery = (query: string) => {
    searchQuerySignal.set(query)
  }

  const selectCollection = (collectionId: string | null): Result<void> => {
    const op = "adminCollectionsSelectCollection"
    if (collectionId !== null && !collections().some((collection) => collection.id === collectionId)) {
      return createResultError(op, `Collection ${collectionId} was not found in the selected organization.`)
    }
    selectedCollectionIdSignal.set(collectionId)
    return createResult(undefined)
  }

  const createCollection = (input: OrganizationCollectionInput): Result<OrganizationCollection> => {
    const op = "adminCollectionsCreateCollection"
    const organizationId = selectedOrganization()?.id
    if (!organizationId) return createResultError(op, "An organization must be selected before creating a collection.")
    const inputResult = adminCollectionInputNormalize(input)
    if (!inputResult.success) return inputResult

    const currentCollections = collectionsByOrganizationSignal.get()[organizationId] ?? []
    const collection: OrganizationCollection = {
      externalId: inputResult.data.externalId ?? null,
      groups: inputResult.data.groups ?? [],
      hidePasswords: false,
      id: adminCollectionIdCreate(organizationId, currentCollections),
      manage: true,
      manageAll: false,
      name: inputResult.data.name,
      organizationId,
      readOnly: false,
      users: inputResult.data.users ?? [],
    }
    collectionMapSet({
      ...collectionsByOrganizationSignal.get(),
      [organizationId]: [...currentCollections, collection],
    })
    selectedCollectionIdSignal.set(collection.id)
    return createResult(collection)
  }

  const updateCollection = (
    collectionId: string,
    input: OrganizationCollectionInput,
  ): Result<OrganizationCollection> => {
    const op = "adminCollectionsUpdateCollection"
    const inputResult = adminCollectionInputNormalize(input)
    if (!inputResult.success) return inputResult
    const map = collectionsByOrganizationSignal.get()
    const organizationId = Object.keys(map).find((candidate) =>
      map[candidate]?.some((collection) => collection.id === collectionId),
    )
    if (!organizationId) return createResultError(op, `Collection ${collectionId} was not found.`)
    const currentCollection = map[organizationId]?.find((collection) => collection.id === collectionId)
    if (!currentCollection) return createResultError(op, `Collection ${collectionId} was not found.`)

    const updatedCollection: OrganizationCollection = {
      ...currentCollection,
      ...inputResult.data,
      groups: inputResult.data.groups?.map((group) => ({ ...group })) ?? currentCollection.groups,
      id: currentCollection.id,
      organizationId: currentCollection.organizationId,
      users: adminCollectionUsersMerge(currentCollection.users, inputResult.data.users),
    }
    collectionMapSet({
      ...map,
      [organizationId]:
        map[organizationId]?.map((collection) => (collection.id === collectionId ? updatedCollection : collection)) ??
        [],
    })
    return createResult(updatedCollection)
  }

  const deleteCollection = (collectionId: string): Result<void> => {
    const op = "adminCollectionsDeleteCollection"
    const map = collectionsByOrganizationSignal.get()
    const organizationId = Object.keys(map).find((candidate) =>
      map[candidate]?.some((collection) => collection.id === collectionId),
    )
    if (!organizationId) return createResultError(op, `Collection ${collectionId} was not found.`)
    const nextCollections = map[organizationId]?.filter((collection) => collection.id !== collectionId) ?? []
    collectionMapSet({ ...map, [organizationId]: nextCollections })
    if (selectedCollectionIdSignal.get() === collectionId)
      selectedCollectionIdSignal.set(nextCollections[0]?.id ?? null)
    return createResult(undefined)
  }

  organizationCollectionCountsSync()
  selectedCollectionIdSignal.set(collections()[0]?.id ?? null)

  return {
    collections,
    collectionsByOrganization: collectionsByOrganizationSignal.get,
    collectionCount,
    createCollection,
    deleteCollection,
    filteredCollections,
    organizations: organizations.get,
    searchQuery: searchQuerySignal.get,
    selectedCollection,
    selectedCollectionId,
    selectedOrganization,
    selectedOrganizationId: selectedOrganizationIdSignal.get,
    selectCollection,
    selectOrganization,
    setSearchQuery,
    updateCollection,
  }
}
