import { demoRouteAliases } from "./demoRouteAliases.js"
import type { PageNameDemo } from "./pageNameDemo.js"

type DemoRoutePageName = PageNameDemo | "organizations"
type DemoRoutePattern = {
  readonly pageName: DemoRoutePageName
  readonly path: string
}

const demoRoutePatterns = demoRouteAliases
  .flatMap(({ pageName, paths }) => paths.map((path) => ({ pageName, path })))
  .sort(demoRoutePatternCompare)

export function demoRouteMatch(pathname: string) {
  const pathSegments = demoRoutePathSegments(pathname)

  for (const routePattern of demoRoutePatterns) {
    const params = demoRoutePatternMatch(routePattern.path, pathSegments)
    if (params === null) continue
    return { pageName: routePattern.pageName, params }
  }

  return null
}

function demoRoutePatternCompare(left: DemoRoutePattern, right: DemoRoutePattern): number {
  const leftSpecificity = demoRoutePatternSpecificity(left.path)
  const rightSpecificity = demoRoutePatternSpecificity(right.path)

  for (let index = 0; index < leftSpecificity.length; index += 1) {
    const leftValue = leftSpecificity[index] ?? 0
    const rightValue = rightSpecificity[index] ?? 0
    if (leftValue !== rightValue) return rightValue - leftValue
  }

  return left.path.localeCompare(right.path)
}

function demoRoutePatternSpecificity(path: string): readonly number[] {
  const segments = demoRoutePathSegments(path)
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

function demoRoutePathSegments(pathname: string): readonly string[] {
  const normalizedPathname = pathname.replace(/\/+$/u, "")
  if (normalizedPathname === "") return []
  return normalizedPathname.split("/").slice(1)
}

function demoRoutePatternMatch(path: string, pathSegments: readonly string[]): Readonly<Record<string, string>> | null {
  return demoRouteSegmentsMatch(demoRoutePathSegments(path), pathSegments)
}

function demoRouteSegmentsMatch(
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
      const result = demoRouteSegmentsMatch(
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
    return demoRouteSegmentsMatch(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, {
      ...params,
      [parameterName]: demoRouteParameterDecode(pathSegment),
    })
  }

  if (patternSegment.toLowerCase() !== pathSegment.toLowerCase()) return null
  return demoRouteSegmentsMatch(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, params)
}

function demoRouteParameterDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
