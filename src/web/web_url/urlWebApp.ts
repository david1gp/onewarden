import type { PageNameWebApp } from "./pageNameWebApp.js"
import { pageNameWebApp } from "./pageNameWebApp.js"
import { pageRouteWebApp } from "./pageRouteWebApp.js"

type PageNameWebAppKey = keyof typeof pageNameWebApp

export function urlWebApp(pageName: PageNameWebApp, params: Readonly<Record<string, string>> = {}): string {
  const pageKey = (Object.keys(pageNameWebApp) as PageNameWebAppKey[]).find((key) => pageNameWebApp[key] === pageName)
  if (!pageKey) return pageRouteWebApp.root

  return pageRouteWebApp[pageKey].replace(/:([a-zA-Z][a-zA-Z0-9_]*)/gu, (placeholder, parameterName: string) => {
    const value = params[parameterName]
    return value === undefined ? placeholder : encodeURIComponent(value)
  })
}
