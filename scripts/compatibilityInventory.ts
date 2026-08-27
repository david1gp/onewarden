import { createResult, createResultError, type Result } from "#result"

const upstreamCommit = "fa2566d14fc745937ce104011475eca9e6c7a6f6"
const upstreamRepository = "https://github.com/dani-garcia/vaultwarden"
const upstreamReferencePath = process.env.ONEWARDEN_VAULTWARDEN_REFERENCE ?? "/home/david/opensource/vaultwarden"
const routeInventoryPath = "docs/compatibility/upstream-api-routes.json"
const testInventoryPath = "docs/compatibility/upstream-tests.json"
const notImplementedStatus = "not_implemented" as const
const compatibleStatus = "compatible" as const
const expectedRouteCount = 307
const expectedRustUnitTestCount = 34
const expectedPlaywrightTestCount = 43

type CompatibilityRoute = {
  id: string
  method: string
  path: string
  group: string
  mount: string
  rank: number | null
  source: {
    file: string
    line: number
    handler: string
  }
  status: typeof notImplementedStatus | typeof compatibleStatus
}

type CompatibilityTest = {
  id: string
  kind: "rust_unit_test" | "playwright_test"
  name: string
  source: {
    file: string
    line: number
    module?: string
  }
  category: string
  upstreamStatus: "active" | "ignored"
  status: typeof notImplementedStatus
}

type CompatibilityRouteInventory = {
  schemaVersion: 1
  kind: "upstream_http_routes"
  provenance: {
    repository: string
    commit: string
    checkout: string
    generator: string
  }
  normalization: string
  deduplication: string
  statusPolicy: string
  counts: {
    total: number
    byGroup: Record<string, number>
    byStatus: Record<string, number>
  }
  routes: CompatibilityRoute[]
}

type CompatibilityTestInventory = {
  schemaVersion: 1
  kind: "upstream_test_contracts"
  provenance: {
    repository: string
    commit: string
    checkout: string
    generator: string
  }
  statusPolicy: string
  counts: {
    total: number
    byKind: Record<string, number>
    byCategory: Record<string, number>
    byStatus: Record<string, number>
    byUpstreamStatus: Record<string, number>
  }
  contracts: CompatibilityTest[]
}

const statusPolicy =
  "not_implemented means OneWarden has no corresponding compatible implementation; the /alive, HEAD /alive, and /api/alive contracts are marked compatible only when their database-backed readiness behavior is satisfied."

const routeNormalization =
  "Prepend the Rocket mount, remove the declared query portion after ?, and retain path parameters and declared trailing slashes."

const routeDeduplication =
  "Do not collapse repeated method/path pairs; each declaration is identified by source file, line, handler, and Rocket rank."

function compatibilityResultError(op: string, error: unknown): ReturnType<typeof createResultError> {
  const message = error instanceof Error ? error.message : String(error)
  return createResultError(op, message)
}

async function compatibilityFileRead(filePath: string): Promise<Result<string>> {
  const op = "compatibilityFileRead"

  try {
    return createResult(await Bun.file(filePath).text())
  } catch (error) {
    return compatibilityResultError(op, error)
  }
}

async function compatibilityFileWrite(filePath: string, content: string): Promise<Result<void>> {
  const op = "compatibilityFileWrite"

  try {
    await Bun.write(filePath, content)
    return createResult(undefined)
  } catch (error) {
    return compatibilityResultError(op, error)
  }
}

function compatibilityCommandOutputGet(command: string[]): Result<string> {
  const op = "compatibilityCommandOutputGet"

  try {
    const result = Bun.spawnSync({ cmd: command, stderr: "pipe", stdout: "pipe" })
    if (result.exitCode !== 0) {
      return createResultError(
        op,
        new TextDecoder().decode(result.stderr).trim() || `Command failed: ${command.join(" ")}`,
      )
    }

    return createResult(new TextDecoder().decode(result.stdout).trim())
  } catch (error) {
    return compatibilityResultError(op, error)
  }
}

function compatibilityReferenceVerify(): Result<void> {
  const commitResult = compatibilityCommandOutputGet(["git", "-C", upstreamReferencePath, "rev-parse", "HEAD"])
  if (!commitResult.success) {
    return commitResult
  }

  if (commitResult.data !== upstreamCommit) {
    return createResultError(
      "compatibilityReferenceVerify",
      `Expected Vaultwarden commit ${upstreamCommit}, found ${commitResult.data || "no commit"}`,
    )
  }

  return createResult(undefined)
}

async function compatibilityReferenceFilesGet(pattern: string): Promise<Result<string[]>> {
  const op = "compatibilityReferenceFilesGet"

  try {
    const files: string[] = []
    const glob = new Bun.Glob(pattern)
    for await (const file of glob.scan({ cwd: upstreamReferencePath, onlyFiles: true })) {
      files.push(file.replaceAll("\\", "/"))
    }
    files.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    return createResult(files)
  } catch (error) {
    return compatibilityResultError(op, error)
  }
}

function compatibilitySourceGroupGet(relativeFile: string): Result<{ group: string; mount: string }> {
  const apiPrefix = "src/api/"
  if (!relativeFile.startsWith(apiPrefix) || !relativeFile.endsWith(".rs")) {
    return createResultError("compatibilitySourceGroupGet", `Unsupported API source path: ${relativeFile}`)
  }

  const apiFile = relativeFile.slice(apiPrefix.length, -3)
  if (apiFile === "web") {
    return createResult({ group: "web", mount: "/" })
  }
  if (apiFile === "admin") {
    return createResult({ group: "admin", mount: "/admin" })
  }
  if (apiFile === "identity") {
    return createResult({ group: "identity", mount: "/identity" })
  }
  if (apiFile === "icons") {
    return createResult({ group: "icons", mount: "/icons" })
  }
  if (apiFile === "notifications") {
    return createResult({ group: "notifications", mount: "/notifications" })
  }
  if (apiFile === "core/mod") {
    return createResult({ group: "core/meta", mount: "/api" })
  }
  if (apiFile.startsWith("core/")) {
    const group = apiFile.endsWith("/mod") ? apiFile.slice(0, -4) : apiFile
    const mount = group === "core/events" ? "/events" : "/api"
    return createResult({ group, mount })
  }

  return createResultError("compatibilitySourceGroupGet", `Unsupported API source group: ${relativeFile}`)
}

function compatibilityRoutePathNormalize(mount: string, declaredPath: string): string {
  const queryIndex = declaredPath.indexOf("?")
  const path = queryIndex === -1 ? declaredPath : declaredPath.slice(0, queryIndex)
  if (mount === "/") {
    return path || "/"
  }
  return `${mount}${path}`
}

function compatibilityRouteStatusGet(
  method: string,
  path: string,
): typeof notImplementedStatus | typeof compatibleStatus {
  if (
    (method === "GET" && (path === "/alive" || path === "/api/alive" || path === "/api/config")) ||
    (method === "HEAD" && path === "/alive")
  )
    return compatibleStatus
  return notImplementedStatus
}

function compatibilityRouteAttributesGet(source: string): Array<{
  method: string
  declaredPath: string
  rank: number | null
  line: number
  handler: string
}> {
  const routes: Array<{
    method: string
    declaredPath: string
    rank: number | null
    line: number
    handler: string
  }> = []
  const routePattern = /#\[(get|post|put|delete|head|patch|options)\(([\s\S]*?)\)\]/g

  for (const match of source.matchAll(routePattern)) {
    const method = match[1]
    const attributes = match[2]
    const matchIndex = match.index
    if (!method || attributes === undefined || matchIndex === undefined) {
      continue
    }

    const pathMatch = attributes.match(/^\s*"((?:\\.|[^"])*)"/)
    if (!pathMatch?.[1]) {
      continue
    }

    const handlerMatch = source
      .slice(matchIndex + match[0].length)
      .match(/\b(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)/)
    if (!handlerMatch?.[1]) {
      continue
    }

    const rankMatch = attributes.match(/\brank\s*=\s*(\d+)/)
    routes.push({
      method: method.toUpperCase(),
      declaredPath: pathMatch[1],
      rank: rankMatch?.[1] ? Number(rankMatch[1]) : null,
      line: source.slice(0, matchIndex).split("\n").length,
      handler: handlerMatch[1],
    })
  }

  return routes
}

async function compatibilityRoutesGenerate(): Promise<Result<CompatibilityRoute[]>> {
  const filesResult = await compatibilityReferenceFilesGet("src/api/**/*.rs")
  if (!filesResult.success) {
    return filesResult
  }

  const routes: CompatibilityRoute[] = []
  for (const relativeFile of filesResult.data) {
    const sourceResult = await compatibilityFileRead(`${upstreamReferencePath}/${relativeFile}`)
    if (!sourceResult.success) {
      return sourceResult
    }

    const sourceRoutes = compatibilityRouteAttributesGet(sourceResult.data)
    if (sourceRoutes.length === 0) {
      continue
    }

    const sourceGroupResult = compatibilitySourceGroupGet(relativeFile)
    if (!sourceGroupResult.success) {
      return sourceGroupResult
    }

    for (const route of sourceRoutes) {
      const path = compatibilityRoutePathNormalize(sourceGroupResult.data.mount, route.declaredPath)
      const id = `${route.method} ${path} ${relativeFile}:${route.line} ${route.handler} rank=${route.rank ?? "default"}`
      routes.push({
        id,
        method: route.method,
        path,
        group: sourceGroupResult.data.group,
        mount: sourceGroupResult.data.mount,
        rank: route.rank,
        source: { file: relativeFile, line: route.line, handler: route.handler },
        status: compatibilityRouteStatusGet(route.method, path),
      })
    }
  }

  routes.sort((left, right) => {
    if (left.source.file !== right.source.file) {
      return left.source.file < right.source.file ? -1 : 1
    }
    if (left.source.line === right.source.line) {
      return left.id === right.id ? 0 : left.id < right.id ? -1 : 1
    }
    return left.source.line - right.source.line
  })
  return createResult(routes)
}

function compatibilityRustCategoryGet(relativeFile: string): string {
  const categories: Record<string, string> = {
    "src/api/admin.rs": "web-vault version comparison",
    "src/api/core/two_factor/email.rs": "email obscuring",
    "src/db/models/organization.rs": "organization model",
    "src/http_client.rs": "HTTP host/IP validation",
    "src/storage.rs": "storage path handling",
    "src/util.rs": "IP address classification",
  }
  return categories[relativeFile] ?? "Rust unit test"
}

function compatibilityRustModuleGet(source: string, testIndex: number): string {
  const beforeTest = source.slice(0, testIndex)
  const modules = [...beforeTest.matchAll(/\bmod\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g)]
  return modules.at(-1)?.[1] ?? "unknown"
}

function compatibilityRustIgnoredGet(source: string, testIndex: number): boolean {
  const testBody = source.slice(testIndex, testIndex + 300)
  const functionIndex = testBody.search(/\bfn\s+[A-Za-z_][A-Za-z0-9_]*/)
  const attributes = functionIndex === -1 ? testBody : testBody.slice(0, functionIndex)
  return /#\[ignore(?:\s*=|\s*\])/.test(attributes)
}

async function compatibilityRustTestsGenerate(): Promise<Result<CompatibilityTest[]>> {
  const filesResult = await compatibilityReferenceFilesGet("{src,tests}/**/*.rs")
  if (!filesResult.success) {
    return filesResult
  }

  const contracts: CompatibilityTest[] = []
  const testPattern = /#\[test\]/g
  for (const relativeFile of filesResult.data) {
    const sourceResult = await compatibilityFileRead(`${upstreamReferencePath}/${relativeFile}`)
    if (!sourceResult.success) {
      return sourceResult
    }

    for (const match of sourceResult.data.matchAll(testPattern)) {
      const matchIndex = match.index
      if (matchIndex === undefined) {
        continue
      }
      const functionMatch = sourceResult.data
        .slice(matchIndex + match[0].length)
        .match(/\bfn\s+([A-Za-z_][A-Za-z0-9_]*)/)
      if (!functionMatch?.[1]) {
        continue
      }

      const upstreamStatus = compatibilityRustIgnoredGet(sourceResult.data, matchIndex) ? "ignored" : "active"
      const functionIndex = matchIndex + match[0].length + (functionMatch.index ?? 0)
      const line = sourceResult.data.slice(0, functionIndex).split("\n").length
      contracts.push({
        id: `rust:${relativeFile}:${line}:${functionMatch[1]}`,
        kind: "rust_unit_test",
        name: functionMatch[1],
        source: { file: relativeFile, line, module: compatibilityRustModuleGet(sourceResult.data, matchIndex) },
        category: compatibilityRustCategoryGet(relativeFile),
        upstreamStatus,
        status: notImplementedStatus,
      })
    }
  }
  return createResult(contracts)
}

function compatibilityPlaywrightCategoryGet(relativeFile: string): string {
  const fileName = relativeFile.split("/").at(-1) ?? relativeFile
  if (fileName.startsWith("sso_login")) {
    return "single sign-on"
  }
  if (fileName.startsWith("login")) {
    return "authentication"
  }
  if (fileName.startsWith("sso_organization")) {
    return "single sign-on organizations"
  }
  if (fileName.startsWith("organization")) {
    return "organizations"
  }
  if (fileName.startsWith("collection")) {
    return "collections"
  }
  if (fileName.startsWith("secrets")) {
    return "secrets"
  }
  if (fileName.startsWith("send")) {
    return "sends"
  }
  if (fileName.startsWith("cyphers")) {
    return "account key settings"
  }
  if (relativeFile.includes("/setups/")) {
    return "test setup"
  }
  return "Playwright test"
}

async function compatibilityPlaywrightTestsGenerate(): Promise<Result<CompatibilityTest[]>> {
  const filesResult = await compatibilityReferenceFilesGet("playwright/tests/**/*.ts")
  if (!filesResult.success) {
    return filesResult
  }

  const contracts: CompatibilityTest[] = []
  const testPattern = /\btest\s*\(\s*(["'`])((?:\\.|[\s\S])*?)\1/g
  for (const relativeFile of filesResult.data) {
    const sourceResult = await compatibilityFileRead(`${upstreamReferencePath}/${relativeFile}`)
    if (!sourceResult.success) {
      return sourceResult
    }

    for (const match of sourceResult.data.matchAll(testPattern)) {
      const matchIndex = match.index
      const name = match[2]
      if (matchIndex === undefined || name === undefined) {
        continue
      }
      const line = sourceResult.data.slice(0, matchIndex).split("\n").length
      contracts.push({
        id: `playwright:${relativeFile}:${line}:${name}`,
        kind: "playwright_test",
        name,
        source: { file: relativeFile, line },
        category: compatibilityPlaywrightCategoryGet(relativeFile),
        upstreamStatus: "active",
        status: notImplementedStatus,
      })
    }
  }
  return createResult(contracts)
}

function compatibilityCountGet(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function compatibilityRoutesValidate(routes: CompatibilityRoute[]): Result<void> {
  const methods = new Set(["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"])
  const ids = new Set<string>()
  for (const route of routes) {
    if (!methods.has(route.method) || !route.path.startsWith("/") || route.path.includes("?")) {
      return createResultError("compatibilityRoutesValidate", `Invalid normalized route: ${route.method} ${route.path}`)
    }
    if (ids.has(route.id)) {
      return createResultError("compatibilityRoutesValidate", `Duplicate route declaration: ${route.id}`)
    }
    ids.add(route.id)
  }
  return createResult(undefined)
}

function compatibilityTestsValidate(contracts: CompatibilityTest[]): Result<void> {
  const ids = new Set<string>()
  for (const contract of contracts) {
    if (!contract.name || !contract.category || contract.status !== notImplementedStatus) {
      return createResultError("compatibilityTestsValidate", `Invalid test contract: ${contract.id}`)
    }
    if (ids.has(contract.id)) {
      return createResultError("compatibilityTestsValidate", `Duplicate test contract: ${contract.id}`)
    }
    ids.add(contract.id)
  }
  return createResult(undefined)
}

function compatibilityExpectedCountsValidate(
  routes: CompatibilityRoute[],
  contracts: CompatibilityTest[],
): Result<void> {
  if (routes.length !== expectedRouteCount) {
    return createResultError(
      "compatibilityExpectedCountsValidate",
      `Expected ${expectedRouteCount} routes, found ${routes.length}`,
    )
  }

  const rustUnitTestCount = contracts.filter((contract) => contract.kind === "rust_unit_test").length
  if (rustUnitTestCount !== expectedRustUnitTestCount) {
    return createResultError(
      "compatibilityExpectedCountsValidate",
      `Expected ${expectedRustUnitTestCount} Rust unit tests, found ${rustUnitTestCount}`,
    )
  }

  const playwrightTestCount = contracts.filter((contract) => contract.kind === "playwright_test").length
  if (playwrightTestCount !== expectedPlaywrightTestCount) {
    return createResultError(
      "compatibilityExpectedCountsValidate",
      `Expected ${expectedPlaywrightTestCount} Playwright tests, found ${playwrightTestCount}`,
    )
  }

  return createResult(undefined)
}

function compatibilityProvenanceGet() {
  return {
    repository: upstreamRepository,
    commit: upstreamCommit,
    checkout: upstreamReferencePath,
    generator: "scripts/compatibilityInventory.ts",
  }
}

function compatibilityRouteInventoryCreate(routes: CompatibilityRoute[]): CompatibilityRouteInventory {
  return {
    schemaVersion: 1,
    kind: "upstream_http_routes",
    provenance: compatibilityProvenanceGet(),
    normalization: routeNormalization,
    deduplication: routeDeduplication,
    statusPolicy,
    counts: {
      total: routes.length,
      byGroup: compatibilityCountGet(routes.map((route) => route.group)),
      byStatus: compatibilityCountGet(routes.map((route) => route.status)),
    },
    routes,
  }
}

function compatibilityTestInventoryCreate(contracts: CompatibilityTest[]): CompatibilityTestInventory {
  return {
    schemaVersion: 1,
    kind: "upstream_test_contracts",
    provenance: compatibilityProvenanceGet(),
    statusPolicy,
    counts: {
      total: contracts.length,
      byKind: compatibilityCountGet(contracts.map((contract) => contract.kind)),
      byCategory: compatibilityCountGet(contracts.map((contract) => contract.category)),
      byStatus: compatibilityCountGet(contracts.map((contract) => contract.status)),
      byUpstreamStatus: compatibilityCountGet(contracts.map((contract) => contract.upstreamStatus)),
    },
    contracts,
  }
}

function compatibilityJsonSerialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function compatibilityInventoryGenerate(): Promise<
  Result<{ routes: CompatibilityRouteInventory; tests: CompatibilityTestInventory }>
> {
  const referenceResult = compatibilityReferenceVerify()
  if (!referenceResult.success) {
    return referenceResult
  }

  const routesResult = await compatibilityRoutesGenerate()
  if (!routesResult.success) {
    return routesResult
  }
  const routeValidationResult = compatibilityRoutesValidate(routesResult.data)
  if (!routeValidationResult.success) {
    return routeValidationResult
  }

  const rustTestsResult = await compatibilityRustTestsGenerate()
  if (!rustTestsResult.success) {
    return rustTestsResult
  }
  const playwrightTestsResult = await compatibilityPlaywrightTestsGenerate()
  if (!playwrightTestsResult.success) {
    return playwrightTestsResult
  }
  const contracts = [...rustTestsResult.data, ...playwrightTestsResult.data].sort((left, right) => {
    if (left.id === right.id) {
      return 0
    }
    return left.id < right.id ? -1 : 1
  })
  const testValidationResult = compatibilityTestsValidate(contracts)
  if (!testValidationResult.success) {
    return testValidationResult
  }
  const expectedCountsResult = compatibilityExpectedCountsValidate(routesResult.data, contracts)
  if (!expectedCountsResult.success) {
    return expectedCountsResult
  }

  return createResult({
    routes: compatibilityRouteInventoryCreate(routesResult.data),
    tests: compatibilityTestInventoryCreate(contracts),
  })
}

async function compatibilityInventoryRun(): Promise<number> {
  const inventoryResult = await compatibilityInventoryGenerate()
  if (!inventoryResult.success) {
    process.stderr.write(`Compatibility inventory failed: ${inventoryResult.errorMessage}\n`)
    return 1
  }

  const routeContent = compatibilityJsonSerialize(inventoryResult.data.routes)
  const testContent = compatibilityJsonSerialize(inventoryResult.data.tests)
  const writeMode = process.argv.includes("--write")
  if (writeMode) {
    const routeWriteResult = await compatibilityFileWrite(routeInventoryPath, routeContent)
    if (!routeWriteResult.success) {
      process.stderr.write(`Compatibility inventory failed: ${routeWriteResult.errorMessage}\n`)
      return 1
    }
    const testWriteResult = await compatibilityFileWrite(testInventoryPath, testContent)
    if (!testWriteResult.success) {
      process.stderr.write(`Compatibility inventory failed: ${testWriteResult.errorMessage}\n`)
      return 1
    }
    process.stdout.write(
      `Generated ${inventoryResult.data.routes.routes.length} routes and ${inventoryResult.data.tests.contracts.length} test contracts.\n`,
    )
    return 0
  }

  const routeReadResult = await compatibilityFileRead(routeInventoryPath)
  const testReadResult = await compatibilityFileRead(testInventoryPath)
  if (!routeReadResult.success || !testReadResult.success) {
    const errorMessage = !routeReadResult.success ? routeReadResult.errorMessage : testReadResult.errorMessage
    process.stderr.write(`Compatibility inventory failed: ${errorMessage}\n`)
    return 1
  }
  if (routeReadResult.data !== routeContent || testReadResult.data !== testContent) {
    process.stderr.write("Compatibility inventories are stale; run bun run compatibility:generate.\n")
    return 1
  }

  process.stdout.write(
    `Validated ${inventoryResult.data.routes.routes.length} routes and ${inventoryResult.data.tests.contracts.length} test contracts.\n`,
  )
  return 0
}

process.exitCode = await compatibilityInventoryRun()
