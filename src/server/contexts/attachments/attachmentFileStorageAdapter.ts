import type { Result } from "#result"

export type AttachmentFileStorageAdapter = {
  delete: (cipherUuid: string, attachmentId?: string) => Promise<Result<void>>
  deleteAll: (cipherUuid: string) => Promise<Result<void>>
  read: (cipherUuid: string, attachmentId: string) => Promise<Result<Uint8Array | null>>
  write: (cipherUuid: string, attachmentId: string, bytes: Uint8Array) => Promise<Result<void>>
}
