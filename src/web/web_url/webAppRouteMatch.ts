import { demoRouteMatch } from "../demo/demo_url/demoRouteMatch.js"
import type { PageNameDemo } from "../demo/demo_url/pageNameDemo.js"
import type { PageNameWebApp } from "./pageNameWebApp.js"
import { pageNameWebApp } from "./pageNameWebApp.js"

type WebAppRoutePattern = {
  readonly pageName: PageNameWebApp
  readonly path: string
}

export type WebAppRouteMatch = {
  readonly pageName: PageNameWebApp | PageNameDemo
  readonly params: Readonly<Record<string, string>>
}

const webAppRoutePatterns = [
  webAppRoutePatternsCreate(pageNameWebApp.root, ["", "/", "/ciphers", "/vault"]),
  webAppRoutePatternsCreate(pageNameWebApp.authLogin, ["/login"]),
  webAppRoutePatternsCreate(pageNameWebApp.authRegister, ["/register", "/signup"]),
  webAppRoutePatternsCreate(pageNameWebApp.authVerify, ["/verify", "/verify-email", "/verify-token"]),
  webAppRoutePatternsCreate(pageNameWebApp.authUnlock, ["/lock", "/unlock"]),
  webAppRoutePatternsCreate(pageNameWebApp.authTwoFactorSetup, [
    "/two-factor",
    "/settings/two-factor",
    "/2fa",
    "/two-factor-setup",
  ]),
  webAppRoutePatternsCreate(pageNameWebApp.ssoConnector, ["/sso-connector.html", "/sso-connector"]),
  webAppRoutePatternsCreate(pageNameWebApp.settings, [
    "/settings",
    "/settings/account",
    "/settings/profile",
    "/settings/security",
    "/settings/email",
    "/settings/devices",
    "/settings/sessions",
    "/settings/tools",
    "/settings/import",
    "/settings/export",
    "/settings/danger",
    "/settings/delete-account",
  ]),
  webAppRoutePatternsCreate(pageNameWebApp.emergencyAccess, ["/settings/emergency", "/emergency-access", "/emergency"]),
  webAppRoutePatternsCreate(pageNameWebApp.sends, ["/sends", "/send"]),
  webAppRoutePatternsCreate(pageNameWebApp.sendAccess, [
    "/send-access",
    "/send/:sendAccessId",
    "/send/:sendAccessId/**",
    "/send/*",
    "/sends/access/:sendAccessId",
    "/sends/access/:sendAccessId/**",
    "/sends/access/*",
  ]),
  webAppRoutePatternsCreate(pageNameWebApp.adminLogin, ["/admin-ui/login"]),
  webAppRoutePatternsCreate(pageNameWebApp.admin, [
    "/admin-ui",
    "/admin-ui/dashboard",
    "/admin-ui/users",
    "/admin-ui/organizations",
    "/admin-ui/diagnostics",
    "/admin-ui/config",
    "/admin-ui/tools",
  ]),
  webAppRoutePatternsCreate(pageNameWebApp.authTwoFactorChallenge, ["/two-factor-challenge", "/2fa-challenge"]),
  webAppRoutePatternsCreate(pageNameWebApp.cipherCreate, ["/ciphers/new", "/ciphers/create", "/vault/new"]),
  webAppRoutePatternsCreate(pageNameWebApp.cipherEdit, [
    "/ciphers/:cipherId/edit",
    "/ciphers/:cipherId/**/edit",
    "/ciphers/**/edit",
    "/vault/:cipherId/edit",
    "/vault/:cipherId/**/edit",
    "/vault/**/edit",
  ]),
  webAppRoutePatternsCreate(pageNameWebApp.cipherView, [
    "/ciphers/:cipherId",
    "/ciphers/:cipherId/**",
    "/ciphers/*",
    "/vault/:cipherId",
    "/vault/:cipherId/**",
    "/vault/*",
  ]),
  webAppRoutePatternsCreate(pageNameWebApp.organizations, ["/organizations", "/organization", "/org"]),
]
  .flatMap(({ pageName, paths }) => paths.map((path) => ({ pageName, path })))
  .sort(webAppRoutePatternCompare)

export function webAppRouteMatch(pathname: string): WebAppRouteMatch {
  const demoMatch = demoRouteMatch(pathname)
  if (demoMatch !== null) return demoMatch

  const pathSegments = webAppRoutePathSegments(pathname)

  for (const routePattern of webAppRoutePatterns) {
    const params = webAppRoutePatternMatch(routePattern.path, pathSegments)
    if (params === null) continue
    return { pageName: routePattern.pageName, params }
  }

  return { pageName: pageNameWebApp.root, params: {} }
}

function webAppRoutePatternsCreate(pageName: PageNameWebApp, paths: readonly string[]) {
  return { pageName, paths }
}

function webAppRoutePatternCompare(left: WebAppRoutePattern, right: WebAppRoutePattern): number {
  const leftSpecificity = webAppRoutePatternSpecificity(left.path)
  const rightSpecificity = webAppRoutePatternSpecificity(right.path)

  for (let index = 0; index < leftSpecificity.length; index += 1) {
    const leftValue = leftSpecificity[index] ?? 0
    const rightValue = rightSpecificity[index] ?? 0
    if (leftValue !== rightValue) return rightValue - leftValue
  }

  return left.path.localeCompare(right.path)
}

function webAppRoutePatternSpecificity(path: string): readonly number[] {
  const segments = webAppRoutePathSegments(path)
  let staticSegments = 0
  let dynamicSegments = 0
  let wildcardSegments = 0

  for (const segment of segments) {
    if (segment === "*" || segment === "**") {
      wildcardSegments += 1
      continue
    }
    if (segment.startsWith(":")) {
      dynamicSegments += 1
      continue
    }
    staticSegments += 1
  }

  return [staticSegments, dynamicSegments, -wildcardSegments, segments.length]
}

function webAppRoutePathSegments(pathname: string): readonly string[] {
  const normalizedPathname = pathname.replace(/\/+$/u, "")
  if (normalizedPathname === "") return []
  return normalizedPathname.split("/").slice(1)
}

function webAppRoutePatternMatch(
  path: string,
  pathSegments: readonly string[],
): Readonly<Record<string, string>> | null {
  return webAppRouteSegmentsMatch(webAppRoutePathSegments(path), pathSegments)
}

function webAppRouteSegmentsMatch(
  patternSegments: readonly string[],
  pathSegments: readonly string[],
  patternIndex = 0,
  pathIndex = 0,
  params: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> | null {
  const patternSegment = patternSegments[patternIndex]
  if (patternSegment === "*" || patternSegment === "**") {
    const minimumConsumed = patternSegment === "*" ? 1 : 0
    if (patternIndex === patternSegments.length - 1) {
      return pathIndex + minimumConsumed <= pathSegments.length ? params : null
    }
    for (let consumed = minimumConsumed; pathIndex + consumed <= pathSegments.length; consumed += 1) {
      const result = webAppRouteSegmentsMatch(
        patternSegments,
        pathSegments,
        patternIndex + 1,
        pathIndex + consumed,
        params,
      )
      if (result !== null) return result
    }
    return null
  }

  if (patternSegment === undefined) return pathIndex === pathSegments.length ? params : null
  const pathSegment = pathSegments[pathIndex]
  if (pathSegment === undefined || pathSegment === "") return null

  if (patternSegment.startsWith(":")) {
    const parameterName = patternSegment.slice(1)
    return webAppRouteSegmentsMatch(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, {
      ...params,
      [parameterName]: webAppRouteParameterDecode(pathSegment),
    })
  }

  if (patternSegment.toLowerCase() !== pathSegment.toLowerCase()) return null
  return webAppRouteSegmentsMatch(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, params)
}

function webAppRouteParameterDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
