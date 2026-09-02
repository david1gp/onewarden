import type { PageNameDemo } from "./pageNameDemo.js"
import { pageNameDemo } from "./pageNameDemo.js"
import { pageRouteDemo } from "./pageRouteDemo.js"

type PageNameDemoKey = keyof typeof pageNameDemo

export function urlDemo(pageName: PageNameDemo, params: Readonly<Record<string, string>> = {}): string {
  const pageKey = (Object.keys(pageNameDemo) as PageNameDemoKey[]).find((key) => pageNameDemo[key] === pageName)
  if (!pageKey) return pageRouteDemo.directory

  return pageRouteDemo[pageKey].replace(/:([a-zA-Z][a-zA-Z0-9_]*)/gu, (placeholder, parameterName: string) => {
    const value = params[parameterName]
    return value === undefined ? placeholder : encodeURIComponent(value)
  })
}
