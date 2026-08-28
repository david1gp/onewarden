export type ExtensionStorageArea = {
  get<T extends Record<string, unknown> = Record<string, unknown>>(keys?: string | string[] | null): Promise<T>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string | string[]): Promise<void>
}
