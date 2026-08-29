import { type Accessor, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"

export interface OrganizationCollectionListProps {
  collections: Accessor<OrganizationCollection[]>
  onCreateClick: () => void
  onSelectCollection: (collectionId: string) => void
  selectedCollectionId: Accessor<string | null>
}

export function organizationCollectionListStateCreate(props: OrganizationCollectionListProps) {
  const searchQuerySignal = createSignalObject("")

  const filteredCollections = createMemo(() => {
    const query = searchQuerySignal.get().toLowerCase().trim()
    const all = props.collections()
    if (!query) return all
    return all.filter(
      (c) => c.name.toLowerCase().includes(query) || (c.externalId?.toLowerCase().includes(query) ?? false),
    )
  })

  const handleSearchChange = (value: string) => {
    searchQuerySignal.set(value)
  }

  const isSelected = (collectionId: string) => props.selectedCollectionId() === collectionId

  const handleCollectionClick = (collectionId: string) => {
    props.onSelectCollection(collectionId)
  }

  return {
    filteredCollections,
    handleCollectionClick,
    handleSearchChange,
    isSelected,
    onCreateClick: props.onCreateClick,
    searchQuery: searchQuerySignal.get,
  }
}
