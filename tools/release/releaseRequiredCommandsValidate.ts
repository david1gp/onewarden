import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"

const releaseRequiredCommands = [
  "bun",
  "cp",
  "curl",
  "date",
  "flock",
  "install",
  "journalctl",
  "mkdir",
  "mktemp",
  "realpath",
  "rm",
  "rsync",
  "sed",
  "sleep",
  "systemctl",
] as const

type ReleaseRequiredCommandsValidateOptions = {
  commandExists?: (command: string) => boolean
}

export function releaseRequiredCommandsValidate(options?: ReleaseRequiredCommandsValidateOptions): Result<void> {
  const op = "releaseRequiredCommandsValidate"
  const commandExists = options?.commandExists ?? ((command: string) => Bun.which(command) !== null)
  for (const command of releaseRequiredCommands) {
    if (!commandExists(command)) return resultErrorCreate(op, `Required deployment command is missing: ${command}.`)
  }
  return resultCreate(undefined)
}
