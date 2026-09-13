import type { Result } from "#result"
import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherPresentationAdapter {
  list: () => Promise<Result<CipherItem[]>>
  get: (id: string) => Promise<Result<CipherItem>>
  create: (data: CipherFormData | CipherItem) => Promise<Result<CipherItem>>
  update: (id: string, data: CipherFormData | CipherItem) => Promise<Result<CipherItem>>
  favorite: (id: string, favorite: boolean) => Promise<Result<void>>
  softDelete: (id: string) => Promise<Result<void>>
  hardDelete: (id: string) => Promise<Result<void>>
  restore: (id: string) => Promise<Result<CipherItem>>
  archive: (id: string, archived: boolean) => Promise<Result<CipherItem>>
  share: (
    id: string,
    organizationId: string,
    collectionIds: string[],
    cipherData: CipherFormData | CipherItem,
  ) => Promise<Result<CipherItem>>
  updateCollections: (id: string, collectionIds: string[]) => Promise<Result<CipherItem>>
  uploadAttachment: (cipherId: string, file: Blob | File, fileName: string) => Promise<Result<CipherItem>>
  deleteAttachment: (cipherId: string, attachmentId: string) => Promise<Result<void>>
  clone: (id: string) => Promise<Result<CipherItem>>
  copyToClipboard: (value: string) => Promise<void> | void
}
