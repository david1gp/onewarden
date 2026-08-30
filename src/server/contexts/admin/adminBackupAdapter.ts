import type { Result } from "#result"

export type AdminBackupAdapter = {
  create: () => Result<string> | Promise<Result<string>>
}
