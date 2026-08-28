import { extname } from "node:path"

export function webContentTypeResolve(path: string): string {
  const extension = extname(path).toLowerCase()
  const contentTypes: Record<string, string> = {
    ".css": "text/css",
    ".gif": "image/gif",
    ".html": "text/html",
    ".ico": "image/x-icon",
    ".js": "application/javascript",
    ".json": "application/json",
    ".map": "application/json",
    ".mjs": "application/javascript",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  }
  return contentTypes[extension] ?? "application/octet-stream"
}
