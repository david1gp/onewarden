import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import { extensionDemoFixtures } from "../../../src/web/demo/extension/extensionDemoFixtures.js"

test("full-window generator demo uses live password generation after the fixture value", () => {
  const fixture = extensionDemoFixtures.fullWindowModels.find(
    (candidate) => candidate.label === "Generator · deterministic local fixture",
  )
  if (fixture === undefined) throw new Error("Missing full-window generator fixture")

  const root = render(() => (
    <ExtensionFullWindowView
      root="div"
      idPrefix={fixture.idPrefix}
      model={() => fixture.model}
      commands={extensionDemoFixtures.fullWindowCommands}
      initialState={fixture.initialState}
      generatorOptions={extensionDemoFixtures.generatorOptions}
    />
  ))

  const actions = root
    .getAllByRole("button")
    .filter((button) =>
      ["Copied", "Regenerate passphrase", "Hide generated secret"].includes(button.getAttribute("aria-label") ?? ""),
    )
  expect(actions.map((button) => button.getAttribute("aria-label"))).toEqual([
    "Copied",
    "Regenerate passphrase",
    "Hide generated secret",
  ])
  expect(actions.map((button) => button.textContent?.trim())).toEqual(["Copied", "Regenerate", "Hide"])

  fireEvent.click(root.getByRole("radio", { name: "Password" }))

  const password = root.getByLabelText("Generated password") as HTMLInputElement
  expect(password.value).not.toBe("Northstar!Demo-2026")
  expect(password.value).toHaveLength(20)

  const firstGeneratedPassword = password.value
  fireEvent.click(root.getByRole("button", { name: "Regenerate password" }))

  expect(password.value).not.toBe(firstGeneratedPassword)
  expect(password.value).toHaveLength(20)

  root.unmount()
})
