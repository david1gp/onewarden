export type IconCacheAdapter = {
  delete: (path: string) => Promise<void>
  read: (path: string) => Promise<Uint8Array | undefined>
  stat: (path: string) => Promise<number | undefined>
  write: (path: string, bytes: Uint8Array) => Promise<void>
}
