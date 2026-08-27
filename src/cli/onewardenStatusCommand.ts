import { type ApplicationContext, buildCommand } from "@stricli/core"
import { packageName } from "../packageName.js"

export const onewardenStatusCommand = buildCommand({
  func(this: ApplicationContext) {
    this.process.stdout.write(`${packageName}\n`)
  },
  parameters: {},
  docs: { brief: "Print the OneWarden package identity" },
})
