import { type Result } from "#result"

export type ServerJob = {
  name: string
  intervalMs: number
  run: () => Result<unknown> | Promise<Result<unknown>>
}
