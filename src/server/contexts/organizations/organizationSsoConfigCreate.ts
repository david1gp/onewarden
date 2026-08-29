import type { Clock } from "../../../shared/clock/clock.js"
import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"

export function organizationSsoConfigCreate(
  organizationUuid: string,
  enabled: boolean,
  data: string,
  clock: Clock,
): OrganizationSsoConfig {
  const now = clock.now().toISOString()
  return { creationDate: now, data, enabled, organizationUuid, revisionDate: now }
}
