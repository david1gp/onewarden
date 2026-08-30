import { join } from "node:path"
import { type Result } from "#result"
import { type ReleaseManifest } from "../../src/server/release/releaseManifestSchema.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import { releaseEnvironmentRead } from "./releaseEnvironmentRead.js"
import { releasePackageValidate } from "./releasePackageValidate.js"
import { releaseRuntimeProtectedPathsRead } from "./releaseRuntimeProtectedPathsRead.js"

type ReleaseCommandResult = {
  exitCode: number
  stdout: string
  stderr: string
}

type ReleaseRequest = (input: string | URL, init?: RequestInit) => Promise<Response>

type ReleasePostdeployVerifyOptions = {
  packageDirectory: string
  runtimeDirectory: string
  serviceName: string
  port: number
  publicOrigin?: string
  attempts?: number
  request?: ReleaseRequest
  commandRun?: (command: string, argumentsList: string[]) => Promise<ReleaseCommandResult>
  sleep?: (milliseconds: number) => Promise<void>
  requireHttpsPublicOrigin?: boolean
}

const releaseExpectedHeaders = {
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
} as const
const releaseExpectedContentSecurityPolicy =
  "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:"
const releaseHealthPaths = ["/health/live", "/health/ready", "/health"] as const
const releaseStartupFailureSignals = [
  "server.configuration.invalid",
  "server.release.invalid",
  "server.icon-configuration.invalid",
  "server.identity-configuration.invalid",
  "database.open-failed",
  "database.migration-failed",
  "two-factor.webauthn-u2f-migration-failed",
  "identity.key-pair-failed",
  "server.start-failed",
] as const

export async function releasePostdeployVerify(options: ReleasePostdeployVerifyOptions): Promise<Result<void>> {
  const op = "releasePostdeployVerify"
  const environmentResult = await releaseEnvironmentRead(join(options.runtimeDirectory, ".env"))
  if (!environmentResult.success) return environmentResult
  const protectedPathsResult = await releaseRuntimeProtectedPathsRead(options.runtimeDirectory)
  if (!protectedPathsResult.success) return protectedPathsResult
  const stagedPackageResult = await releasePackageValidate(options.packageDirectory)
  if (!stagedPackageResult.success) return stagedPackageResult
  const deployedPackageResult = await releasePackageValidate(options.runtimeDirectory, {
    ignoredPaths: protectedPathsResult.data,
  })
  if (!deployedPackageResult.success) return deployedPackageResult
  const releaseMatchResult = releasePostdeployReleaseValidate(stagedPackageResult.data, deployedPackageResult.data)
  if (!releaseMatchResult.success) return releaseMatchResult
  const publicOrigin = options.publicOrigin ?? environmentResult.data.PUBLIC_ORIGIN ?? Bun.env.PUBLIC_ORIGIN
  if (publicOrigin === undefined || publicOrigin.length === 0)
    return resultErrorCreate(op, "PUBLIC_ORIGIN is required for external health verification.")
  let originUrl: URL
  try {
    originUrl = new URL(publicOrigin)
  } catch {
    return resultErrorCreate(op, "PUBLIC_ORIGIN is invalid.")
  }
  if ((options.requireHttpsPublicOrigin ?? true) && originUrl.protocol !== "https:")
    return resultErrorCreate(op, "PUBLIC_ORIGIN must use HTTPS for external health verification.")

  const commandRun = options.commandRun ?? releasePostdeployCommandRun
  const activeResult = await commandRun("systemctl", ["--user", "is-active", "--quiet", options.serviceName])
  if (activeResult.exitCode !== 0) return resultErrorCreate(op, "OneWarden systemd service is not active.")
  const enabledResult = await commandRun("systemctl", ["--user", "is-enabled", "--quiet", options.serviceName])
  if (enabledResult.exitCode !== 0) return resultErrorCreate(op, "OneWarden systemd service is not enabled.")

  const request = options.request ?? globalThis.fetch
  const sleep = options.sleep ?? releasePostdeploySleep
  const configuredAttempts = Number(Bun.env.ONEWARDEN_DEPLOY_TIMEOUT_SECONDS ?? "30")
  const attempts = Math.max(1, options.attempts ?? (Number.isInteger(configuredAttempts) ? configuredAttempts : 30))
  const localOrigin = `http://127.0.0.1:${options.port}`
  let lastError = "OneWarden service did not become ready."
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const healthResult = await releasePostdeployLocalHealthValidate(request, localOrigin, stagedPackageResult.data)
    if (healthResult.success) {
      const spaResult = await releasePostdeploySpaValidate(request, localOrigin)
      if (!spaResult.success) return spaResult
      const compatibilityResult = await releasePostdeployCompatibilityValidate(request, localOrigin)
      if (!compatibilityResult.success) return compatibilityResult
      const externalResult = await releasePostdeployExternalHealthValidate(request, originUrl, stagedPackageResult.data)
      if (!externalResult.success) return externalResult
      const logResult = await releasePostdeployStartupLogValidate(commandRun, options.serviceName)
      if (!logResult.success) return logResult
      return resultCreate(undefined)
    }
    lastError = healthResult.errorMessage
    if (attempt + 1 < attempts) await sleep(1_000)
  }
  return resultErrorCreate(op, lastError)
}

async function releasePostdeployLocalHealthValidate(
  request: ReleaseRequest,
  origin: string,
  release: ReleaseManifest,
): Promise<Result<void>> {
  const op = "releasePostdeployLocalHealthValidate"
  for (const path of releaseHealthPaths) {
    let response: Response
    try {
      response = await request(`${origin}${path}`)
    } catch {
      return resultErrorCreate(op, `Local health request failed: ${path}.`)
    }
    if (response.status !== 200) return resultErrorCreate(op, `Local health request was not ready: ${path}.`)
    const bodyResult = await releasePostdeployHealthBodyValidate(response)
    if (!bodyResult.success) return bodyResult
    if (response.headers.get("cache-control") !== "no-store")
      return resultErrorCreate(op, "Health cache-control header is missing.")
    if (response.headers.get("content-security-policy") !== null)
      return resultErrorCreate(op, "Health response must not include a document CSP.")
    const headersResult = releasePostdeployHeadersValidate(response, release)
    if (!headersResult.success) return headersResult
  }
  return resultCreate(undefined)
}

function releasePostdeployReleaseValidate(staged: ReleaseManifest, deployed: ReleaseManifest): Result<void> {
  const op = "releasePostdeployReleaseValidate"
  const identityFields = [
    "application",
    "releaseVersion",
    "gitHead",
    "gitTag",
    "builtAt",
    "bunVersion",
    "schemaVersion",
    "schemaIdentity",
    "artifactFormat",
  ] as const
  for (const field of identityFields) {
    if (staged[field] !== deployed[field])
      return resultErrorCreate(op, "Deployed release identity does not match staged release.")
  }
  if (staged.artifactSha256 !== deployed.artifactSha256)
    return resultErrorCreate(op, "Deployed release artifact does not match staged release.")
  return resultCreate(undefined)
}

async function releasePostdeploySpaValidate(request: ReleaseRequest, origin: string): Promise<Result<void>> {
  const op = "releasePostdeploySpaValidate"
  let response: Response
  try {
    response = await request(`${origin}/`)
  } catch {
    return resultErrorCreate(op, "Root SPA request failed.")
  }
  if (response.status !== 200) return resultErrorCreate(op, "Root SPA response was not successful.")
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html"))
    return resultErrorCreate(op, "Root SPA response is not HTML.")
  if (response.headers.get("content-security-policy") !== releaseExpectedContentSecurityPolicy)
    return resultErrorCreate(op, "Root SPA Content-Security-Policy header is invalid.")
  return resultCreate(undefined)
}

async function releasePostdeployHealthBodyValidate(response: Response): Promise<Result<void>> {
  const op = "releasePostdeployHealthBodyValidate"
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return resultErrorCreate(op, "Health response is not valid JSON.")
  }
  if (typeof body !== "object" || body === null || !("status" in body) || body.status !== "ok")
    return resultErrorCreate(op, "Health response is not ready.")
  return resultCreate(undefined)
}

function releasePostdeployHeadersValidate(response: Response, release: ReleaseManifest): Result<void> {
  const op = "releasePostdeployHeadersValidate"
  for (const [name, expected] of Object.entries(releaseExpectedHeaders)) {
    if (response.headers.get(name) !== expected) return resultErrorCreate(op, `Security header mismatch: ${name}.`)
  }
  const identityHeaders = {
    "x-onewarden-release-artifact": release.artifactSha256,
    "x-onewarden-release-commit": release.gitHead,
    "x-onewarden-schema-identity": release.schemaIdentity,
    "x-onewarden-schema-version": String(release.schemaVersion),
  }
  for (const [name, expected] of Object.entries(identityHeaders)) {
    if (response.headers.get(name) !== expected)
      return resultErrorCreate(op, `Release identity header mismatch: ${name}.`)
  }
  return resultCreate(undefined)
}

async function releasePostdeployCompatibilityValidate(request: ReleaseRequest, origin: string): Promise<Result<void>> {
  const op = "releasePostdeployCompatibilityValidate"
  let response: Response
  try {
    response = await request(`${origin}/api/config`)
  } catch {
    return resultErrorCreate(op, "Representative compatibility request failed.")
  }
  if (response.status !== 200) return resultErrorCreate(op, "Representative compatibility response was not successful.")
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json"))
    return resultErrorCreate(op, "Representative compatibility response is not JSON.")
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return resultErrorCreate(op, "Representative compatibility response is invalid JSON.")
  }
  if (typeof body !== "object" || body === null || !("object" in body) || body.object !== "config")
    return resultErrorCreate(op, "Representative compatibility response is invalid.")
  for (const [name, expected] of Object.entries(releaseExpectedHeaders)) {
    if (response.headers.get(name) !== expected) return resultErrorCreate(op, `Security header mismatch: ${name}.`)
  }
  if (response.headers.get("content-security-policy") !== null)
    return resultErrorCreate(op, "API response must not include a document CSP.")
  return resultCreate(undefined)
}

async function releasePostdeployExternalHealthValidate(
  request: ReleaseRequest,
  origin: URL,
  release: ReleaseManifest,
): Promise<Result<void>> {
  const op = "releasePostdeployExternalHealthValidate"
  const healthUrl = new URL("/health", origin)
  try {
    const response = await request(healthUrl)
    if (response.status !== 200) return resultErrorCreate(op, "External public-origin health is not ready.")
    const bodyResult = await releasePostdeployHealthBodyValidate(response)
    if (!bodyResult.success) return bodyResult
    if (response.headers.get("cache-control") !== "no-store")
      return resultErrorCreate(op, "External health cache-control header is missing.")
    if (response.headers.get("content-security-policy") !== null)
      return resultErrorCreate(op, "External health must not include a document CSP.")
    const headersResult = releasePostdeployHeadersValidate(response, release)
    if (!headersResult.success) return headersResult
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "External public-origin health request failed.")
  }
}

async function releasePostdeployStartupLogValidate(
  commandRun: (command: string, argumentsList: string[]) => Promise<ReleaseCommandResult>,
  serviceName: string,
): Promise<Result<void>> {
  const op = "releasePostdeployStartupLogValidate"
  const result = await commandRun("journalctl", ["--user", "-u", serviceName, "-n", "200", "--no-pager"])
  if (result.exitCode !== 0) return resultErrorCreate(op, "Startup logs could not be read.")
  for (const signal of releaseStartupFailureSignals) {
    if (result.stdout.includes(`"message":"${signal}"`)) return resultErrorCreate(op, `Startup logs contain ${signal}.`)
  }
  if (!result.stdout.includes('"message":"server.started"'))
    return resultErrorCreate(op, "Startup logs do not contain server.started.")
  return resultCreate(undefined)
}

async function releasePostdeployCommandRun(command: string, argumentsList: string[]): Promise<ReleaseCommandResult> {
  try {
    const process = Bun.spawn([command, ...argumentsList], { stderr: "pipe", stdout: "pipe" })
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ])
    return { exitCode, stderr, stdout }
  } catch {
    return { exitCode: 1, stderr: "", stdout: "" }
  }
}

async function releasePostdeploySleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

if (import.meta.main) {
  const values = releasePostdeployArgumentsRead(process.argv.slice(2))
  if (values === undefined) {
    console.error(
      "Usage: bun tools/release/releasePostdeployVerify.ts --package <dir> --runtime <dir> --service <name> --port <port>",
    )
    process.exitCode = 1
  } else {
    const result = await releasePostdeployVerify(values)
    if (!result.success) {
      console.error(`Postdeploy verification failed: ${result.errorMessage}`)
      process.exitCode = 1
    } else {
      console.log("Postdeploy verification passed.")
    }
  }
}

function releasePostdeployArgumentsRead(argumentsList: string[]): ReleasePostdeployVerifyOptions | undefined {
  const values = new Map<string, string>()
  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index]
    const value = argumentsList[index + 1]
    if (name === undefined || value === undefined || !name.startsWith("--")) return undefined
    values.set(name.slice(2), value)
  }
  const packageDirectory = values.get("package")
  const runtimeDirectory = values.get("runtime")
  const serviceName = values.get("service")
  const publicOrigin = values.get("public-origin")
  const portText = values.get("port")
  const port = portText === undefined ? Number.NaN : Number(portText)
  if (packageDirectory === undefined || runtimeDirectory === undefined || serviceName === undefined) return undefined
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return undefined
  return { packageDirectory, publicOrigin, runtimeDirectory, serviceName, port }
}
