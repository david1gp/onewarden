import type { HibpHttpAdapter } from "./hibpHttpAdapter.js"

type HibpHttpAdapterCreateOptions = {
  fetch?: HibpHttpFetcher
}

type HibpHttpFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export function hibpHttpAdapterCreate(options?: HibpHttpAdapterCreateOptions): HibpHttpAdapter {
  const fetcher = options?.fetch ?? globalThis.fetch
  return {
    fetch: (url, init) => fetcher(url, init),
  }
}
