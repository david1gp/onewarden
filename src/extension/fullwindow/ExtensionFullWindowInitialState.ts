export interface ExtensionFullWindowInitialState {
  pane?: string
  selectedLoginId?: string
  category?: string
  query?: string
  siteOnly?: boolean
  selectedCipherId?: string
  deleteCipherConfirmation?: boolean
  deleteAttachmentId?: string
  restorePasswordHistoryIndex?: number
  folderId?: string
  collectionId?: string
  organizationId?: string
  resourceAction?: "folder-delete" | "collection-delete"
}
