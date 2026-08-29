export type HibpHttpAdapter = {
  fetch: (url: string, init?: RequestInit) => Promise<Response>
}
