import { serverAppCreate } from "./serverAppCreate.js"

export function serverListen(): void {
  const application = serverAppCreate()

  Bun.serve({
    fetch: application.fetch,
    hostname: process.env.ONEWARDEN_HOST ?? "127.0.0.1",
    port: Number(process.env.ONEWARDEN_PORT ?? "3000"),
  })
}
