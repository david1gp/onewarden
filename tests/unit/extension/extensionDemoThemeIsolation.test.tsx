import { afterEach, expect, test } from "bun:test"
import { fireEvent, render, within } from "@solidjs/testing-library"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import { ExtensionPopupView } from "../../../src/extension/popup/ExtensionPopupView.jsx"
import { extensionPopupViewModelCreate } from "../../../src/extension/popup/extensionPopupViewModelCreate.js"
import { ExtensionDemoFrame } from "../../../src/web/demo/extension/ExtensionDemoFrame.jsx"
import { extensionDemoFixtures } from "../../../src/web/demo/extension/extensionDemoFixtures.js"

afterEach(() => {
  document.documentElement.classList.remove("dark")
})

test("extension demo frames isolate popup and frame themes from siblings and the host document", () => {
  document.documentElement.classList.add("dark")
  const root = render(() => (
    <>
      <ExtensionDemoFrame label="Popup fixture" initialTheme="light">
        {(theme, themeSet) => (
          <ExtensionPopupView
            root="div"
            idPrefix="isolated-popup-"
            model={extensionPopupViewModelCreate({ status: "loading" })}
            commands={extensionDemoFixtures.popupCommands}
            theme={theme}
            onThemeChange={themeSet}
          />
        )}
      </ExtensionDemoFrame>
      <ExtensionDemoFrame label="Sibling fixture" initialTheme="dark">
        {(theme) => <p>Sibling theme: {theme()}</p>}
      </ExtensionDemoFrame>
    </>
  ))

  const popupPreview = root.getByRole("region", { name: "Popup fixture preview" })
  const siblingPreview = root.getByRole("region", { name: "Sibling fixture preview" })
  expect(popupPreview.dataset.extensionTheme).toBe("light")
  expect(siblingPreview.dataset.extensionTheme).toBe("dark")

  fireEvent.click(within(popupPreview).getByRole("button", { name: "Switch to dark theme" }))
  expect(popupPreview.dataset.extensionTheme).toBe("dark")
  expect(siblingPreview.dataset.extensionTheme).toBe("dark")
  expect(document.documentElement.classList.contains("dark")).toBe(true)

  const popupThemeControls = root.getByRole("group", { name: "Popup fixture preview theme" })
  expect(popupThemeControls.classList.contains("extension-theme-root")).toBe(true)
  expect(popupThemeControls.dataset.extensionTheme).toBeUndefined()
  expect(popupThemeControls.dataset.extensionThemeSource).toBe("host")
  expect(popupThemeControls.classList.contains("dark")).toBe(false)
  expect(
    within(popupThemeControls).getByRole("button", { name: "Dark" }).classList.contains("extension-selected-control"),
  ).toBe(true)

  fireEvent.click(
    within(root.getByRole("group", { name: "Sibling fixture preview theme" })).getByRole("button", { name: "Light" }),
  )
  expect(siblingPreview.dataset.extensionTheme).toBe("light")
  expect(popupPreview.dataset.extensionTheme).toBe("dark")
  expect(popupThemeControls.dataset.extensionThemeSource).toBe("host")
  expect(popupThemeControls.classList.contains("dark")).toBe(false)
  expect(document.documentElement.classList.contains("dark")).toBe(true)

  root.unmount()
})

test("web host CSS imports scoped extension colors without palette overrides", async () => {
  const webStyles = await Bun.file(new URL("../../../src/web/webStyles.css", import.meta.url)).text()
  const extensionStyles = await Bun.file(
    new URL("../../../src/extension/extensionThemeStyles.css", import.meta.url),
  ).text()

  expect(webStyles).toContain('@import "../extension/extensionThemeStyles.css"')
  expect(webStyles).toContain('.extension-theme-root[data-extension-theme="light"] *')
  expect(webStyles).not.toContain(".bg-emerald-700")
  expect(webStyles).not.toContain(".bg-rose-700")
  expect(webStyles).not.toMatch(/\.border-amber-200\s*{/)
  expect(webStyles).not.toContain("#master-password")
  expect(extensionStyles).not.toContain("extension-demo-theme-control")
  expect(extensionStyles).toContain('.dark .extension-theme-root[data-extension-theme-source="host"]')
  expect(extensionStyles).toContain(".extension-selected-control:is(")
  expect(extensionStyles).toMatch(
    /\.extension-selected-control:not\([^}]+\)\s*\{\s*color:\s*var\(--color-secondary-foreground\);/u,
  )
  expect(extensionStyles).toContain(
    ".extension-theme-root.dark .extension-popup-navigation-tabs .extension-selected-control",
  )
})

test("extension demo fixtures cover auth and every production full-window pane with unique roots", () => {
  const labels = extensionDemoFixtures.fullWindowModels.map((fixture) => fixture.label)
  const idPrefixes = [
    ...extensionDemoFixtures.popupModels.map((fixture) => fixture.idPrefix),
    ...extensionDemoFixtures.fullWindowModels.map((fixture) => fixture.idPrefix),
  ]

  expect(labels).toContain("Authentication · account registration")
  expect(labels).toContain("Authentication · two-step challenge")
  expect(labels).toContain("Vault · cipher extras and custom fields")
  expect(labels).toContain("Vault · attachment delete confirmation")
  expect(labels).toContain("Vault · password restore confirmation")
  expect(labels).toContain("Vault pane · secure note delete confirmation")
  expect(labels).toContain("Vault pane · card delete confirmation")
  expect(labels).toContain("Vault pane · identity delete confirmation")
  expect(labels).toContain("Vault pane · SSH key delete confirmation")
  expect(labels).toContain("Vault resources · folder delete confirmation")
  expect(labels).toContain("Vault resources · collection delete confirmation")
  expect(labels.some((label) => label.startsWith("Generator"))).toBe(true)
  expect(labels.some((label) => label.startsWith("Settings"))).toBe(true)
  expect(new Set(idPrefixes).size).toBe(idPrefixes.length)
})

test("extension demo fixture states expose the shared full-window vault surface", () => {
  const fixtureGet = (label: string) => {
    const fixture = extensionDemoFixtures.fullWindowModels.find((candidate) => candidate.label === label)
    if (fixture === undefined) throw new Error(`Missing extension demo fixture: ${label}`)
    return fixture
  }
  const renderFixture = (label: string) => {
    const fixture = fixtureGet(label)
    return render(() => (
      <ExtensionFullWindowView
        root="div"
        idPrefix={fixture.idPrefix}
        model={() => fixture.model}
        commands={extensionDemoFixtures.fullWindowCommands}
        initialState={fixture.initialState}
      />
    ))
  }

  const vault = renderFixture("Vault · cipher extras and custom fields")
  expect(vault.getByRole("region", { name: "Vault Items" })).toBeDefined()
  expect(vault.getByRole("button", { name: /Northstar Mail ada@northstar.test/ })).toBeDefined()
  expect(vault.getByRole("heading", { name: "Northstar Mail" })).toBeDefined()
  vault.unmount()
})

test("popup demo navigation keeps text tabs and icon actions in one compact row", () => {
  const root = render(() => (
    <ExtensionPopupView
      root="div"
      model={extensionPopupViewModelCreate({ status: "loading", hostname: "mail.northstar.test" })}
      commands={extensionDemoFixtures.popupCommands}
    />
  ))
  const navigation = root.getByRole("navigation", { name: "Extension navigation" })

  const contentNavigation = root.getByRole("group", { name: "Vault and generator" })
  expect(contentNavigation.classList.contains("grid-cols-2")).toBe(true)
  expect(contentNavigation.classList.contains("min-w-40")).toBe(true)
  expect(contentNavigation.querySelectorAll("button")).toHaveLength(2)
  expect(contentNavigation.querySelectorAll("svg")).toHaveLength(2)
  expect(contentNavigation.contains(root.getByRole("button", { name: "Settings" }))).toBe(false)
  expect(root.container.firstElementChild?.classList.contains("box-border")).toBe(true)
  expect(root.container.firstElementChild?.classList.contains("max-w-full")).toBe(true)
  for (const button of contentNavigation.querySelectorAll("button"))
    expect(button.classList.contains("min-w-0")).toBe(true)
  expect(root.getByRole("button", { name: "Settings" }).textContent).toBe("")
  expect(root.getByRole("button", { name: "Switch to dark theme" }).textContent).toBe("")
  expect(navigation.querySelectorAll("button")).toHaveLength(4)
  expect(navigation.classList.contains("flex-wrap")).toBe(true)
  expect(root.queryByText("OneWarden", { exact: true })).toBeNull()
  expect(root.queryByText("mail.northstar.test", { exact: true })).toBeNull()
  expect(root.queryByLabelText("Active site")).toBeNull()
  root.unmount()
})

test("standalone popup delegates its width to the shrinkable popup surface", async () => {
  const popupDocument = await Bun.file(new URL("../../../src/extension/popup/index.html", import.meta.url)).text()

  expect(popupDocument).toContain('name="viewport" content="width=device-width, initial-scale=1"')
  expect(popupDocument).toContain("<body>")
  expect(popupDocument).not.toContain('class="w-[360px]"')
})
