export function identityOriginResolve(configuredOrigin: string | undefined, requestUrl: string): string {
  const origin = configuredOrigin === undefined ? new URL(requestUrl).origin : new URL(configuredOrigin).origin
  return origin.endsWith("/") ? origin.slice(0, -1) : origin
}
