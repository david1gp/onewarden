import { lookup } from "node:dns/promises"
import type { IconHttpAdapter } from "./iconHttpAdapter.js"

export function iconHttpAdapterCreate(): IconHttpAdapter {
  return {
    fetch: (url, init) => globalThis.fetch(url, init),
    resolveHost: async (host) => {
      const addresses = await lookup(host, { all: true, verbatim: true })
      return addresses.map((address) => address.address)
    },
  }
}
