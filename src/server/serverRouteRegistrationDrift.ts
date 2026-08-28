import type { ServerRouteRegistration } from "./serverRouteRegistrationIntrospect.js"

function serverRouteRegistrationPath(registration: ServerRouteRegistration): string {
  const basePath = registration.basePath === "/" ? "" : registration.basePath.replace(/\/$/, "")
  const path = registration.path.startsWith("/") ? registration.path : `/${registration.path}`
  return `${basePath}${path}` || "/"
}

function serverRouteRegistrationKey(registration: ServerRouteRegistration): string {
  return `${registration.method.toUpperCase()} ${serverRouteRegistrationPath(registration)}`
}

function serverRouteRegistrationSort(left: ServerRouteRegistration, right: ServerRouteRegistration): number {
  const leftKey = serverRouteRegistrationKey(left)
  const rightKey = serverRouteRegistrationKey(right)
  if (leftKey < rightKey) return -1
  if (leftKey > rightKey) return 1
  return 0
}

export function serverRouteRegistrationDrift(
  actual: readonly ServerRouteRegistration[],
  expected: readonly ServerRouteRegistration[],
): { extra: ServerRouteRegistration[]; missing: ServerRouteRegistration[] } {
  const unmatchedActual = [...actual]
  const missing: ServerRouteRegistration[] = []

  for (const expectedRegistration of expected) {
    const matchIndex = unmatchedActual.findIndex(
      (actualRegistration) =>
        serverRouteRegistrationKey(actualRegistration) === serverRouteRegistrationKey(expectedRegistration),
    )
    if (matchIndex === -1) {
      missing.push(expectedRegistration)
      continue
    }
    unmatchedActual.splice(matchIndex, 1)
  }

  return {
    extra: unmatchedActual.sort(serverRouteRegistrationSort),
    missing: missing.sort(serverRouteRegistrationSort),
  }
}
