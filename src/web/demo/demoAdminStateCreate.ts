import { createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { adminDemoStateCreate } from "./adminDemoStateCreate.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { urlDemo } from "./demo_url/urlDemo.js"

type DemoAdminStateProps = Readonly<{
  readonly pathname?: () => string
  readonly search?: () => string
  readonly hash?: () => string
  readonly navigate?: (path: string) => void
  readonly navigateReplace?: (path: string) => void
}>

function demoAdminLoginPathCheck(pathname: string) {
  return pathname.replace(/\/+$/, "").toLowerCase() === `${urlDemo(pageNameDemo.admin)}/login`
}

export function demoAdminStateCreate(props: DemoAdminStateProps = {}) {
  const adminState = adminDemoStateCreate()
  const pathname = props.pathname ?? (() => urlDemo(pageNameDemo.admin))
  const loginVisible = createSignalObject(demoAdminLoginPathCheck(pathname()))

  createEffect(() => loginVisible.set(demoAdminLoginPathCheck(pathname())))
  const loginShow = () => {
    loginVisible.set(true)
    props.navigate?.(`${urlDemo(pageNameDemo.admin)}/login${props.search?.() ?? ""}${props.hash?.() ?? ""}`)
  }
  const loginComplete = () => {
    loginVisible.set(false)
    const path = `${urlDemo(pageNameDemo.admin)}${props.search?.() ?? ""}${props.hash?.() ?? ""}`
    const navigateReplace = props.navigateReplace ?? props.navigate
    navigateReplace?.(path)
  }

  return {
    adminState,
    loginVisible: loginVisible.get,
    loginShow,
    loginComplete,
  }
}
