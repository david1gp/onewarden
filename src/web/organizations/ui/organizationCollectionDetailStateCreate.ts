import type { Accessor } from "solid-js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"

export interface OrganizationCollectionDetailProps {
  collection: Accessor<OrganizationCollection | null>
  onBack?: () => void
  onDelete: (collectionId: string) => Promise<void>
  onEdit: (collection: OrganizationCollection) => void
}

export function organizationCollectionDetailStateCreate(props: OrganizationCollectionDetailProps) {
  const currentCol = () => props.collection()

  const handleEditClick = () => {
    const col = currentCol()
    if (col) props.onEdit(col)
  }

  const handleDeleteClick = () => {
    const col = currentCol()
    if (col) void props.onDelete(col.id)
  }

  const handleBackClick = () => props.onBack?.()

  return {
    collection: currentCol,
    handleBackClick,
    handleDeleteClick,
    handleEditClick,
    hasBack: () => Boolean(props.onBack),
  }
}
