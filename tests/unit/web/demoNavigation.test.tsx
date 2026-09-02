import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { createRoot, createSignal } from "solid-js"
import { DemoDirectory } from "../../../src/web/demo/DemoDirectory.jsx"
import { demoAdminStateCreate } from "../../../src/web/demo/demoAdminStateCreate.js"
import { demoSettingsStateCreate } from "../../../src/web/demo/demoSettingsStateCreate.js"
import { pageNameDemo } from "../../../src/web/demo/demo_url/pageNameDemo.js"
import { urlDemo } from "../../../src/web/demo/demo_url/urlDemo.js"
import { VaultDemoHeader } from "../../../src/web/demo/VaultDemoHeader.jsx"

test("demo settings follows injected router location and preserves query and hash", async () => {
  await new Promise<void>((resolve, reject) =>
    createRoot((dispose) => {
      const [pathname, setPathname] = createSignal("/demo/settings/profile")
      const paths: string[] = []
      const state = demoSettingsStateCreate({
        pathname,
        search: () => "?from=demo",
        hash: () => "#security",
        navigate: (path) => {
          paths.push(path)
          setPathname(new URL(path, "http://localhost").pathname)
        },
      })

      try {
        expect(state.currentSection()).toBe("profile")

        state.sectionSelect("security")

        expect(paths).toEqual(["/demo/settings/security?from=demo#security"])
        setPathname("/demo/settings/email")
        queueMicrotask(() => {
          try {
            expect(state.currentSection()).toBe("email")
            dispose()
            resolve()
          } catch (error) {
            dispose()
            reject(error)
          }
        })
      } catch (error) {
        dispose()
        reject(error)
      }
    }),
  )
})

test("demo admin uses router push and replace callbacks for login transitions", () => {
  createRoot((dispose) => {
    const [pathname, setPathname] = createSignal(urlDemo(pageNameDemo.admin))
    const pushedPaths: string[] = []
    const replacedPaths: string[] = []
    const state = demoAdminStateCreate({
      pathname,
      search: () => "?from=demo",
      hash: () => "#login",
      navigate: (path) => {
        pushedPaths.push(path)
        setPathname(new URL(path, "http://localhost").pathname)
      },
      navigateReplace: (path) => {
        replacedPaths.push(path)
        setPathname(new URL(path, "http://localhost").pathname)
      },
    })

    try {
      expect(state.loginVisible()).toBe(false)
      state.loginShow()
      expect(pushedPaths).toEqual(["/demo/admin/login?from=demo#login"])
      expect(state.loginVisible()).toBe(true)

      state.loginComplete()

      expect(replacedPaths).toEqual(["/demo/admin?from=demo#login"])
      expect(state.loginVisible()).toBe(false)
    } finally {
      dispose()
    }
  })
})

test("demo directory and vault header links invoke injected SPA navigation", () => {
  const paths: string[] = []
  const directory = render(() => <DemoDirectory navigate={(path) => paths.push(path)} />)
  const header = render(() => (
    <VaultDemoHeader currentDemo={pageNameDemo.allItems} navigate={(path) => paths.push(path)} />
  ))

  try {
    fireEvent.click(directory.getByRole("link", { name: /Administration Workspace/ }))
    fireEvent.click(header.getByRole("link", { name: "Demo Index" }))

    expect(paths).toEqual([urlDemo(pageNameDemo.admin), urlDemo(pageNameDemo.directory)])
  } finally {
    directory.unmount()
    header.unmount()
  }
})
