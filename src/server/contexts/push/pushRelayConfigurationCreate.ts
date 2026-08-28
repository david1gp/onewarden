import type { PushRelayConfiguration } from "./pushRelayConfiguration.js"

export function pushRelayConfigurationCreate(overrides?: Partial<PushRelayConfiguration>): PushRelayConfiguration {
  return {
    enabled: overrides?.enabled ?? false,
    relayUri: overrides?.relayUri ?? "https://push.bitwarden.com",
    identityUri: overrides?.identityUri ?? "https://identity.bitwarden.com",
    installationId: overrides?.installationId ?? "",
    installationKey: overrides?.installationKey ?? "",
  }
}
