import { buildApplication, help, version } from "@stricli/core"
import { packageVersion } from "../packageVersion.js"
import { onewardenCliRoutes } from "./onewardenCliRoutes.js"

export const onewardenCliApplication = buildApplication(
  onewardenCliRoutes,
  {
    name: "onewarden",
    scanner: { caseStyle: "allow-kebab-for-camel" },
  },
  {
    help: help({
      brief: "Print help information and exit",
      formatting: {
        caseStyle: "convert-camel-to-kebab",
        onlyRequiredInUsageLine: false,
        useAliasInUsageLine: false,
      },
    }),
    version: version({
      brief: "Print version information and exit",
      info: { currentVersion: packageVersion },
    }),
  },
)
