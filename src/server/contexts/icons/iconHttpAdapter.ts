export type IconHttpAdapter = {
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  resolveHost?: (host: string) => Promise<readonly string[]>
}
