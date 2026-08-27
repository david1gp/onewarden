#!/usr/bin/env bun

import { run } from "@stricli/core"
import { onewardenCliApplication as onewardenCliApplicationSource } from "../cli/onewardenCliApplication.js"

const onewardenCliApplication = onewardenCliApplicationSource

export { onewardenCliApplication }

if (import.meta.main) await run(onewardenCliApplication, process.argv.slice(2), { process })
