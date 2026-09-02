import type { PageNameDemo } from "../demo/demo_url/pageNameDemo.js"
import type { PageNameWebApp } from "./pageNameWebApp.js"
import { webAppRouteMatch } from "./webAppRouteMatch.js"

export type WebAppRouteName = PageNameWebApp | PageNameDemo

export function webAppRouteResolve(pathname: string): WebAppRouteName {
  return webAppRouteMatch(pathname).pageName
}
