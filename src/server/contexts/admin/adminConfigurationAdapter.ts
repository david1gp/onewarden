import type { Result } from "#result"

export type AdminConfigurationAdapter = {
  getPreparedJson: () => unknown
  getSupportJson: () => unknown
  update: (data: Record<string, unknown>) => Result<void>
  delete: () => Result<void>
}
