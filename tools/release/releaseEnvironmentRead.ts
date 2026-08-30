import { readFile } from "node:fs/promises"
import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"

export async function releaseEnvironmentRead(
  environmentPath: string,
): Promise<Result<Readonly<Record<string, string>>>> {
  const op = "releaseEnvironmentRead"
  let contents: string
  try {
    contents = await readFile(environmentPath, "utf8")
  } catch (error) {
    if (releaseEnvironmentReadIsNotFound(error)) return resultCreate({})
    return resultErrorCreate(op, "Environment file could not be read.")
  }

  const environment: Record<string, string> = {}
  for (const line of contents.split(/\r?\n/u)) {
    const trimmedLine = line.trim()
    if (trimmedLine.length === 0 || trimmedLine.startsWith("#")) continue
    const assignment = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(trimmedLine)
    if (assignment === null) return resultErrorCreate(op, "Environment file contains an invalid assignment.")
    const name = assignment[1]
    const rawValue = assignment[2]
    if (name === undefined || rawValue === undefined) return resultErrorCreate(op, "Environment file is invalid.")
    const valueResult = releaseEnvironmentValueRead(rawValue)
    if (!valueResult.success) return valueResult
    environment[name] = valueResult.data
  }
  return resultCreate(environment)
}

function releaseEnvironmentValueRead(value: string): Result<string> {
  if (value.length === 0) return resultCreate(value)
  const first = value[0]
  const last = value.at(-1)
  if (first === '"' || first === "'") {
    if (last !== first || value.length < 2)
      return resultErrorCreate("releaseEnvironmentValueRead", "Environment value quotes are unbalanced.")
    return resultCreate(value.slice(1, -1))
  }
  if (last === '"' || last === "'")
    return resultErrorCreate("releaseEnvironmentValueRead", "Environment value quotes are unbalanced.")
  return resultCreate(value)
}

function releaseEnvironmentReadIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
