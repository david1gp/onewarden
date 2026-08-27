import { expect, test } from "bun:test"
import { run } from "@stricli/core"
import { onewardenCliApplication } from "../src/cli/onewardenCliApplication.js"
import { packageName } from "../src/packageName.js"
import { serverAppCreate } from "../src/server/serverAppCreate.js"

test("the library entry point publishes package identity", async () => {
  const library = await import("../src/outputs/library.js")

  expect(library.packageName).toBe(packageName)
  expect(library.packageVersion).toBeString()
})

test("the Stricli application runs its status command", async () => {
  let output = ""
  const process = {
    env: {},
    exitCode: undefined as number | undefined,
    stderr: { write: () => undefined },
    stdout: { write: (value: string) => (output += value) },
  }

  await run(onewardenCliApplication, ["status"], { process })

  expect(output).toBe(`${packageName}\n`)
  expect(process.exitCode).toBe(0)
})
