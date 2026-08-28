import type { Result } from "#result"

export type SendFileStorageAdapter = {
  delete: (sendUuid: string) => Promise<Result<void>>
  read: (sendUuid: string, fileId: string) => Promise<Result<Uint8Array | null>>
  write: (sendUuid: string, fileId: string, bytes: Uint8Array) => Promise<Result<void>>
}
