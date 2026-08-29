type HonoRoute = {
  basePath: string
  method: string
  path: string
}

type HonoRouteApp = {
  routes: readonly HonoRoute[]
}

export type ServerRouteRegistration = {
  basePath: string
  method: string
  path: string
}

export function serverRouteRegistrationIntrospect(app: HonoRouteApp): ServerRouteRegistration[] {
  const registrations = app.routes
    .map(({ basePath, method, path }) => ({ basePath, method: method.toUpperCase(), path }))
    .filter((route) => route.method !== "ALL")

  return registrations.sort((left, right) => {
    const leftKey = `${left.basePath} ${left.method} ${left.path}`
    const rightKey = `${right.basePath} ${right.method} ${right.path}`
    if (leftKey < rightKey) return -1
    if (leftKey > rightKey) return 1
    return 0
  })
}
