import { afterEach, expect, test } from "bun:test"
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { backupBundleCreate } from "../../../src/server/backup/backupBundleCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { type ReleaseManifest } from "../../../src/server/release/releaseManifestSchema.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { sha256Hex } from "../../../src/shared/crypto/sha256Hex.js"
import { releaseManifestGenerate } from "../../../tools/release/releaseManifestGenerate.js"
import { releasePackageValidate } from "../../../tools/release/releasePackageValidate.js"
import { releasePostdeployVerify } from "../../../tools/release/releasePostdeployVerify.js"
import { releasePredeployVerify } from "../../../tools/release/releasePredeployVerify.js"
import { releaseRequiredCommandsValidate } from "../../../tools/release/releaseRequiredCommandsValidate.js"
import { releaseRuntimeSnapshotCreate } from "../../../tools/release/releaseRuntimeSnapshotCreate.js"
import { releaseRuntimeSnapshotRestore } from "../../../tools/release/releaseRuntimeSnapshotRestore.js"
import { releaseVerify } from "../../../tools/release/releaseVerify.js"

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

function testDirectoryCreate(): string {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-release-test-"))
  temporaryDirectories.push(directory)
  return directory
}

function commandRun(command: string, argumentsList: string[], cwd: string): void {
  const result = Bun.spawnSync([command, ...argumentsList], { cwd, stderr: "pipe", stdout: "pipe" })
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr))
}

function releasePackageFixtureCreate(root: string): string {
  const packageDirectory = join(root, "package")
  mkdirSync(join(packageDirectory, "server"), { recursive: true })
  mkdirSync(join(packageDirectory, "tools", "backup"), { recursive: true })
  mkdirSync(join(packageDirectory, "migrations"), { recursive: true })
  mkdirSync(join(packageDirectory, "build", "web"), { recursive: true })
  writeFileSync(join(packageDirectory, "server", "server.js"), "console.log('server')")
  writeFileSync(join(packageDirectory, "tools", "backup", "backupCli.js"), "console.log('backup')")
  writeFileSync(join(packageDirectory, "tools", "backup", "restoreCli.js"), "console.log('restore')")
  for (const migration of readdirSync(join(process.cwd(), "migrations")))
    copyFileSync(join(process.cwd(), "migrations", migration), join(packageDirectory, "migrations", migration))
  writeFileSync(join(packageDirectory, "build", "web", "index.html"), "<!doctype html>")
  writeFileSync(
    join(packageDirectory, "package.json"),
    JSON.stringify({ engines: { bun: ">=1.4.0" }, name: "onewarden", version: "0.0.0" }),
  )
  writeFileSync(join(packageDirectory, "bun.lock"), "{}")
  return packageDirectory
}

function gitFixtureCreate(root: string): string {
  const gitDirectory = join(root, "git")
  mkdirSync(gitDirectory, { recursive: true })
  commandRun("git", ["init", "--quiet"], gitDirectory)
  commandRun("git", ["config", "user.email", "release-test@example.com"], gitDirectory)
  commandRun("git", ["config", "user.name", "Release Test"], gitDirectory)
  writeFileSync(join(gitDirectory, "tracked.txt"), "clean")
  commandRun("git", ["add", "tracked.txt"], gitDirectory)
  commandRun("git", ["commit", "--quiet", "-m", "fixture"], gitDirectory)
  return gitDirectory
}

function releaseHealthResponseCreate(release: {
  artifactSha256: string
  gitHead: string
  schemaIdentity: string
  schemaVersion: number
}): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "x-onewarden-release-artifact": release.artifactSha256,
    "x-onewarden-release-commit": release.gitHead,
    "x-onewarden-schema-identity": release.schemaIdentity,
    "x-onewarden-schema-version": String(release.schemaVersion),
  })
  return new Response(JSON.stringify({ status: "ok" }), { headers, status: 200 })
}

function releaseSpaResponseCreate(): Response {
  return new Response("<!doctype html><html></html>", {
    headers: {
      "content-security-policy":
        "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:",
      "content-type": "text/html; charset=utf-8",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
    },
    status: 200,
  })
}

test("release manifest generation is deterministic and includes sorted package integrity entries", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)

  const firstResult = await releaseManifestGenerate(packageDirectory, { bunVersion: "1.4.0", gitDirectory })
  expect(firstResult.success).toBe(true)
  if (!firstResult.success) return
  const firstManifest = readFileSync(join(packageDirectory, "release.json"), "utf8")
  const secondResult = await releaseManifestGenerate(packageDirectory, { bunVersion: "1.4.0", gitDirectory })
  expect(secondResult).toEqual(firstResult)
  expect(readFileSync(join(packageDirectory, "release.json"), "utf8")).toBe(firstManifest)
  expect(firstResult.data.gitHead).toHaveLength(40)
  expect(firstResult.data.gitTag).toBeNull()
  expect(
    firstResult.data.files.every((file, index) => file.path < (firstResult.data.files[index + 1]?.path ?? "\uffff")),
  ).toBe(true)
  expect(firstResult.data.files.some((file) => file.path === "release.json")).toBe(false)

  commandRun("git", ["tag", "release-fixture"], gitDirectory)
  const taggedResult = await releaseManifestGenerate(packageDirectory, { bunVersion: "1.4.0", gitDirectory })
  expect(taggedResult.success).toBe(true)
  if (taggedResult.success) expect(taggedResult.data.gitTag).toBe("release-fixture")
})

test("release manifest generation refuses a dirty Git fixture", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  writeFileSync(join(gitDirectory, "uncommitted.txt"), "dirty")

  const result = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(result).toMatchObject({ success: false, errorMessage: "A release package requires a clean Git tree." })
})

test("required deployment command validation is injectable and fails closed", () => {
  const missingResult = releaseRequiredCommandsValidate({ commandExists: (command) => command !== "rsync" })
  expect(missingResult).toMatchObject({
    success: false,
    errorMessage: "Required deployment command is missing: rsync.",
  })
  expect(releaseRequiredCommandsValidate({ commandExists: () => true })).toEqual({ success: true, data: undefined })
})

test("dirty Git override requires explicit test mode", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  writeFileSync(join(gitDirectory, "uncommitted.txt"), "dirty")

  const withoutTestMode = await releaseManifestGenerate(packageDirectory, { gitDirectory, allowDirtyWorktree: true })
  expect(withoutTestMode).toMatchObject({
    success: false,
    errorMessage: "A release package requires a clean Git tree.",
  })

  const previousTestMode = Bun.env.ONEWARDEN_RELEASE_TEST_MODE
  try {
    Bun.env.ONEWARDEN_RELEASE_TEST_MODE = "1"
    const withTestMode = await releaseManifestGenerate(packageDirectory, { gitDirectory, allowDirtyWorktree: true })
    expect(withTestMode.success).toBe(true)
  } finally {
    if (previousTestMode === undefined) delete Bun.env.ONEWARDEN_RELEASE_TEST_MODE
    else Bun.env.ONEWARDEN_RELEASE_TEST_MODE = previousTestMode
  }
})

test("predeploy validates the package, unit, environment, and safe paths before an initial install", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "HOST=127.0.0.1\nPORT=3041\nPUBLIC_ORIGIN=https://vault.example.com\n")
  const unitFile = join(root, "onewarden.service")
  writeFileSync(
    unitFile,
    `[Unit]\n[Service]\nType=simple\nWorkingDirectory=${runtimeDirectory}\nEnvironment=NODE_ENV=production\nEnvironment=HOST=127.0.0.1\nEnvironment=PORT=3041\nEnvironmentFile=-${runtimeDirectory}/.env\nExecStart=/usr/bin/env bun server/server.js\nRestart=on-failure\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\n[Install]\nWantedBy=default.target\n`,
  )
  const installedUnitFile = join(root, "systemd", "onewarden.service")
  mkdirSync(join(root, "systemd"), { recursive: true })
  copyFileSync(unitFile, installedUnitFile)

  const result = await releasePredeployVerify({
    installedUnitFile,
    packageDirectory,
    port: 3041,
    runtimeDirectory,
    unitFile,
  })
  expect(result.success).toBe(true)
  if (result.success) expect(result.data.backupPath).toBeUndefined()
})

test("predeploy creates and validates a backup before an existing database can be deployed", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  const databaseDirectory = join(runtimeDirectory, "data")
  mkdirSync(databaseDirectory, { recursive: true })
  mkdirSync(join(databaseDirectory, "sends"), { recursive: true })
  mkdirSync(join(databaseDirectory, "attachments"), { recursive: true })
  writeFileSync(join(databaseDirectory, "sends", "send.txt"), "send")
  writeFileSync(join(databaseDirectory, "attachments", "attachment.txt"), "attachment")
  const databaseResult = databaseTestCreate()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return
  writeFileSync(join(databaseDirectory, "database.sqlite3"), databaseResult.data.serialize())
  expect(databaseClose(databaseResult.data).success).toBe(true)
  writeFileSync(
    join(runtimeDirectory, ".env"),
    "HOST=127.0.0.1\nPORT=3041\nDATABASE_PATH=./data/database.sqlite3\nPUBLIC_ORIGIN=https://vault.example.com\n",
  )
  const unitFile = join(root, "onewarden.service")
  writeFileSync(
    unitFile,
    `[Unit]\n[Service]\nType=simple\nWorkingDirectory=${runtimeDirectory}\nEnvironment=NODE_ENV=production\nEnvironment=HOST=127.0.0.1\nEnvironment=PORT=3041\nEnvironmentFile=-${runtimeDirectory}/.env\nExecStart=/usr/bin/env bun server/server.js\nRestart=on-failure\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\n[Install]\nWantedBy=default.target\n`,
  )

  const result = await releasePredeployVerify({ packageDirectory, port: 3041, runtimeDirectory, unitFile })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.backupPath).toContain("onewarden-backup-")
    const backupManifest = JSON.parse(readFileSync(join(result.data.backupPath ?? "", "manifest.json"), "utf8")) as {
      files: Array<{ path: string }>
    }
    expect(backupManifest.files.map((file) => file.path)).toEqual([
      "attachments/attachment.txt",
      "database.sqlite3",
      "sends/send.txt",
    ])
  }
})

test("predeploy rejects an unsafe source/runtime layout before backup creation", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  expect((await releaseManifestGenerate(packageDirectory, { gitDirectory })).success).toBe(true)
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")
  const unitFile = join(root, "onewarden.service")
  writeFileSync(
    unitFile,
    `[Unit]\n[Service]\nType=simple\nWorkingDirectory=${runtimeDirectory}\nEnvironment=NODE_ENV=production\nEnvironment=HOST=127.0.0.1\nEnvironment=PORT=3041\nEnvironmentFile=-${runtimeDirectory}/.env\nExecStart=/usr/bin/env bun server/server.js\nRestart=on-failure\nUMask=0077\nNoNewPrivileges=true\nPrivateTmp=true\n[Install]\nWantedBy=default.target\n`,
  )
  const backupCreate: typeof backupBundleCreate = async () => {
    throw new Error("backup must not run")
  }

  const result = await releasePredeployVerify({
    backupCreate,
    packageDirectory,
    port: 3041,
    runtimeDirectory,
    sourceDirectory: root,
    unitFile,
  })
  expect(result).toMatchObject({
    success: false,
    errorMessage: "Source checkout and managed runtime paths must be distinct.",
  })
})

test("release package validation rejects an unsupported Bun engine", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  writeFileSync(
    join(packageDirectory, "package.json"),
    JSON.stringify({ engines: { bun: ">=99.0.0" }, name: "onewarden", version: "0.0.0" }),
  )
  expect((await releaseManifestGenerate(packageDirectory, { gitDirectory })).success).toBe(true)
  expect(await releasePackageValidate(packageDirectory)).toMatchObject({
    success: false,
    errorMessage: "Bun does not satisfy the packaged release engine requirement.",
  })
})

test("postdeploy checks systemd, local and public health, compatibility, headers, and startup logs", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  cpSync(packageDirectory, runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")
  mkdirSync(join(runtimeDirectory, "data", "attachments"), { recursive: true })
  writeFileSync(join(runtimeDirectory, "data", "onewarden.sqlite3"), "preserve me")
  const calls: string[] = []
  const result = await releasePostdeployVerify({
    attempts: 1,
    commandRun: async (command, argumentsList) => {
      calls.push(`${command} ${argumentsList.join(" ")}`)
      return { exitCode: 0, stderr: "", stdout: '... "message":"server.started" ...' }
    },
    packageDirectory,
    port: 3041,
    request: async (input) => {
      const url = String(input)
      if (url.endsWith("/")) return releaseSpaResponseCreate()
      if (url.endsWith("/api/config"))
        return new Response(JSON.stringify({ object: "config", version: "test" }), {
          headers: {
            "cache-control": "no-store",
            "content-type": "application/json",
            "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
            "x-frame-options": "SAMEORIGIN",
          },
        })
      return releaseHealthResponseCreate(manifestResult.data)
    },
    runtimeDirectory,
    serviceName: "onewarden.service",
  })
  expect(result).toEqual({ success: true, data: undefined })
  expect(calls).toEqual([
    "systemctl --user is-active --quiet onewarden.service",
    "systemctl --user is-enabled --quiet onewarden.service",
    "journalctl --user -u onewarden.service -n 200 --no-pager",
  ])
})

test("postdeploy rejects an unexpected runtime artifact", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  cpSync(packageDirectory, runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")
  writeFileSync(join(runtimeDirectory, "unexpected.txt"), "must not be preserved")

  const result = await releasePostdeployVerify({
    packageDirectory,
    runtimeDirectory,
    serviceName: "onewarden.service",
    port: 3041,
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Release package contents do not match release.json.",
  })
})

test("postdeploy rejects a deployed release identity mismatch", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  cpSync(packageDirectory, runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")
  const deployedManifest = JSON.parse(readFileSync(join(runtimeDirectory, "release.json"), "utf8")) as {
    gitHead: string
  }
  deployedManifest.gitHead = "a".repeat(40)
  writeFileSync(join(runtimeDirectory, "release.json"), JSON.stringify(deployedManifest))

  const result = await releasePostdeployVerify({
    packageDirectory,
    runtimeDirectory,
    serviceName: "onewarden.service",
    port: 3041,
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Deployed release identity does not match staged release.",
  })
})

test("postdeploy rejects a deployed release artifact mismatch", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  cpSync(packageDirectory, runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")
  const deployedManifest = JSON.parse(readFileSync(join(runtimeDirectory, "release.json"), "utf8")) as ReleaseManifest
  const changedServer = "console.log('changed')"
  const changedFile = deployedManifest.files.find((file) => file.path === "server/server.js")
  expect(changedFile).toBeDefined()
  if (changedFile === undefined) return
  writeFileSync(join(runtimeDirectory, changedFile.path), changedServer)
  const fileHashResult = await sha256Hex(new TextEncoder().encode(changedServer))
  expect(fileHashResult.success).toBe(true)
  if (!fileHashResult.success) return
  changedFile.sha256 = fileHashResult.data
  changedFile.size = new TextEncoder().encode(changedServer).byteLength
  const artifactHashResult = await sha256Hex(new TextEncoder().encode(JSON.stringify(deployedManifest.files)))
  expect(artifactHashResult.success).toBe(true)
  if (!artifactHashResult.success) return
  deployedManifest.artifactSha256 = artifactHashResult.data
  writeFileSync(join(runtimeDirectory, "release.json"), JSON.stringify(deployedManifest))

  const result = await releasePostdeployVerify({
    packageDirectory,
    runtimeDirectory,
    serviceName: "onewarden.service",
    port: 3041,
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Deployed release artifact does not match staged release.",
  })
})

test("postdeploy rejects a root response without the exact HTML-only CSP", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  cpSync(packageDirectory, runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")

  const result = await releasePostdeployVerify({
    attempts: 1,
    commandRun: async () => ({ exitCode: 0, stderr: "", stdout: '... "message":"server.started" ...' }),
    packageDirectory,
    port: 3041,
    request: async (input) => {
      const url = String(input)
      if (url.endsWith("/")) return new Response("<html></html>", { headers: { "content-type": "text/html" } })
      return releaseHealthResponseCreate(manifestResult.data)
    },
    runtimeDirectory,
    serviceName: "onewarden.service",
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Root SPA Content-Security-Policy header is invalid.",
  })
})

test("postdeploy reports every configured startup failure signal", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return
  const runtimeDirectory = join(root, "runtime")
  mkdirSync(runtimeDirectory, { recursive: true })
  cpSync(packageDirectory, runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")

  const result = await releasePostdeployVerify({
    attempts: 1,
    commandRun: async (command) => ({
      exitCode: 0,
      stderr: "",
      stdout: command === "journalctl" ? '... "message":"database.migration-failed" ...' : "",
    }),
    packageDirectory,
    port: 3041,
    request: async (input) => {
      const url = String(input)
      if (url.endsWith("/")) return releaseSpaResponseCreate()
      if (url.endsWith("/api/config"))
        return new Response(JSON.stringify({ object: "config", version: "test" }), {
          headers: {
            "content-type": "application/json",
            "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
            "referrer-policy": "no-referrer",
            "x-content-type-options": "nosniff",
            "x-frame-options": "SAMEORIGIN",
          },
        })
      return releaseHealthResponseCreate(manifestResult.data)
    },
    runtimeDirectory,
    serviceName: "onewarden.service",
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Startup logs contain database.migration-failed.",
  })
})

test("server health responses expose the packaged release and schema identity", async () => {
  const release = {
    artifactSha256: "a".repeat(64),
    gitHead: "b".repeat(40),
    schemaIdentity: "onewarden-schema-17",
    schemaVersion: 17,
  }
  const response = await serverAppCreate({ release }).request("http://localhost/health/live")
  expect(response.headers.get("x-onewarden-release-artifact")).toBe(release.artifactSha256)
  expect(response.headers.get("x-onewarden-release-commit")).toBe(release.gitHead)
  expect(response.headers.get("x-onewarden-schema-identity")).toBe(release.schemaIdentity)
  expect(response.headers.get("x-onewarden-schema-version")).toBe("17")
})

test("runtime rollback restores the previous package while preserving environment and data", async () => {
  const root = testDirectoryCreate()
  const runtimeDirectory = join(root, "runtime")
  const snapshotDirectory = join(root, "previous")
  mkdirSync(join(runtimeDirectory, "data"), { recursive: true })
  mkdirSync(join(runtimeDirectory, "sends"), { recursive: true })
  mkdirSync(join(runtimeDirectory, "backups"), { recursive: true })
  writeFileSync(join(runtimeDirectory, "server.js"), "old")
  writeFileSync(join(runtimeDirectory, ".env.production"), "environment backup\n")
  writeFileSync(join(runtimeDirectory, "onewarden.sqlite3-wal"), "sqlite wal")
  writeFileSync(join(runtimeDirectory, "backups", "backup.txt"), "backup")
  writeFileSync(
    join(runtimeDirectory, ".env"),
    "secret=preserve\nDATABASE_PATH=./data/onewarden.sqlite3\nSENDS_FOLDER=./sends\nATTACHMENTS_FOLDER=./attachments\nBACKUP_FOLDER=./backups\n",
  )
  writeFileSync(join(runtimeDirectory, "data", "onewarden.sqlite3"), "data")
  writeFileSync(join(runtimeDirectory, "sends", "send.txt"), "send")
  expect(await releaseRuntimeSnapshotCreate(runtimeDirectory, snapshotDirectory)).toEqual({
    success: true,
    data: undefined,
  })
  expect(readdirSync(snapshotDirectory)).toEqual(["server.js"])
  writeFileSync(join(runtimeDirectory, "server.js"), "failed")
  writeFileSync(join(runtimeDirectory, "failed-artifact"), "keep only in failed snapshot")

  expect(await releaseRuntimeSnapshotRestore(snapshotDirectory, runtimeDirectory)).toEqual({
    success: true,
    data: undefined,
  })
  expect(readFileSync(join(runtimeDirectory, "server.js"), "utf8")).toBe("old")
  expect(existsSync(join(runtimeDirectory, "failed-artifact"))).toBe(false)
  expect(readFileSync(join(runtimeDirectory, ".env"), "utf8")).toContain("secret=preserve")
  expect(readFileSync(join(runtimeDirectory, "data", "onewarden.sqlite3"), "utf8")).toBe("data")
  expect(readFileSync(join(runtimeDirectory, "sends", "send.txt"), "utf8")).toBe("send")
  expect(readFileSync(join(runtimeDirectory, ".env.production"), "utf8")).toContain("environment backup")
  expect(readFileSync(join(runtimeDirectory, "onewarden.sqlite3-wal"), "utf8")).toBe("sqlite wal")
  expect(readFileSync(join(runtimeDirectory, "backups", "backup.txt"), "utf8")).toBe("backup")
})

test("runtime snapshots fail without replacing an existing snapshot or leaving staging directories", async () => {
  const root = testDirectoryCreate()
  const runtimeDirectory = join(root, "runtime")
  const snapshotDirectory = join(root, "previous")
  mkdirSync(runtimeDirectory, { recursive: true })
  mkdirSync(snapshotDirectory, { recursive: true })
  writeFileSync(join(snapshotDirectory, "marker"), "keep")
  symlinkSync(join(root, "missing-target"), join(runtimeDirectory, "unsupported-link"))

  const result = await releaseRuntimeSnapshotCreate(runtimeDirectory, snapshotDirectory)

  expect(result.success).toBe(false)
  expect(readFileSync(join(snapshotDirectory, "marker"), "utf8")).toBe("keep")
  expect(readdirSync(root).some((entry) => entry.startsWith(".previous.staging-"))).toBe(false)
})

test("missing runtimes do not mutate a pre-existing runtime snapshot", async () => {
  const root = testDirectoryCreate()
  const snapshotDirectory = join(root, "previous")
  mkdirSync(snapshotDirectory, { recursive: true })
  writeFileSync(join(snapshotDirectory, "marker"), "keep")

  expect(await releaseRuntimeSnapshotCreate(join(root, "missing-runtime"), snapshotDirectory)).toEqual({
    success: true,
    data: undefined,
  })
  expect(readFileSync(join(snapshotDirectory, "marker"), "utf8")).toBe("keep")
})

test("nested configured storage stays protected without hiding neighboring package files", async () => {
  const root = testDirectoryCreate()
  const runtimeDirectory = join(root, "runtime")
  const snapshotDirectory = join(root, "previous")
  mkdirSync(join(runtimeDirectory, "storage", "sends"), { recursive: true })
  mkdirSync(join(runtimeDirectory, "storage", "attachments"), { recursive: true })
  writeFileSync(
    join(runtimeDirectory, ".env"),
    "DATABASE_PATH=./storage/onewarden.sqlite3\nSENDS_FOLDER=./storage/sends\nATTACHMENTS_FOLDER=./storage/attachments\nBACKUP_FOLDER=./storage/backups\nICON_CACHE_FOLDER=./storage/icon-cache\n",
  )
  writeFileSync(join(runtimeDirectory, "storage", "package-file"), "package")
  writeFileSync(join(runtimeDirectory, "storage", "onewarden.sqlite3"), "database")
  writeFileSync(join(runtimeDirectory, "storage", "sends", "send.txt"), "send")
  writeFileSync(join(runtimeDirectory, "storage", "attachments", "attachment.txt"), "attachment")

  expect((await releaseRuntimeSnapshotCreate(runtimeDirectory, snapshotDirectory)).success).toBe(true)
  expect(readFileSync(join(snapshotDirectory, "storage", "package-file"), "utf8")).toBe("package")
  expect(existsSync(join(snapshotDirectory, "storage", "onewarden.sqlite3"))).toBe(false)
  expect(existsSync(join(snapshotDirectory, "storage", "sends"))).toBe(false)

  writeFileSync(join(runtimeDirectory, "storage", "package-file"), "failed")
  writeFileSync(join(runtimeDirectory, "storage", "failed-file"), "failed")
  expect((await releaseRuntimeSnapshotRestore(snapshotDirectory, runtimeDirectory)).success).toBe(true)
  expect(readFileSync(join(runtimeDirectory, "storage", "package-file"), "utf8")).toBe("package")
  expect(existsSync(join(runtimeDirectory, "storage", "failed-file"))).toBe(false)
  expect(readFileSync(join(runtimeDirectory, "storage", "onewarden.sqlite3"), "utf8")).toBe("database")
  expect(readFileSync(join(runtimeDirectory, "storage", "sends", "send.txt"), "utf8")).toBe("send")
  expect(readFileSync(join(runtimeDirectory, "storage", "attachments", "attachment.txt"), "utf8")).toBe("attachment")
})

test("runtime rollback validates the complete package before changing the runtime", async () => {
  const root = testDirectoryCreate()
  const runtimeDirectory = join(root, "runtime")
  const snapshotDirectory = join(root, "previous")
  mkdirSync(runtimeDirectory, { recursive: true })
  writeFileSync(join(runtimeDirectory, "server.js"), "failed")
  writeFileSync(join(runtimeDirectory, ".env"), "PUBLIC_ORIGIN=https://vault.example.com\n")
  mkdirSync(snapshotDirectory, { recursive: true })
  writeFileSync(join(snapshotDirectory, "server.js"), "old")
  symlinkSync(join(root, "missing-target"), join(snapshotDirectory, "unsupported-link"))

  const result = await releaseRuntimeSnapshotRestore(snapshotDirectory, runtimeDirectory)

  expect(result.success).toBe(false)
  expect(readFileSync(join(runtimeDirectory, "server.js"), "utf8")).toBe("failed")
  expect(readFileSync(join(runtimeDirectory, ".env"), "utf8")).toContain("PUBLIC_ORIGIN")
})

test("release package validation detects an integrity change", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  expect((await releaseManifestGenerate(packageDirectory, { gitDirectory })).success).toBe(true)
  writeFileSync(join(packageDirectory, "server", "server.js"), "console.log('broken')")
  const result = await releasePackageValidate(packageDirectory)
  expect(result).toMatchObject({ success: false, errorMessage: "Release hash mismatch for server/server.js." })
})

test("standalone release verification validates the packaged identity and contents", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { bunVersion: "1.4.0", gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return

  expect(manifestResult.data.application).toBe("onewarden")
  expect(manifestResult.data.releaseVersion).toBe("0.0.0")
  expect(manifestResult.data.gitHead).toHaveLength(40)
  expect(manifestResult.data.gitTag).toBeNull()
  expect(manifestResult.data.builtAt.endsWith("Z")).toBe(true)
  expect(manifestResult.data.artifactFormat).toBe(1)
  expect(await releaseVerify(packageDirectory)).toMatchObject({ success: true })

  const manifest = JSON.parse(readFileSync(join(packageDirectory, "release.json"), "utf8")) as {
    artifactFormat: number
  }
  manifest.artifactFormat = 2
  writeFileSync(join(packageDirectory, "release.json"), JSON.stringify(manifest))
  expect(await releaseVerify(packageDirectory)).toMatchObject({ success: false })
})

test("standalone release verification rejects duplicate migration versions", async () => {
  const root = testDirectoryCreate()
  const gitDirectory = gitFixtureCreate(root)
  const packageDirectory = releasePackageFixtureCreate(root)
  const manifestResult = await releaseManifestGenerate(packageDirectory, { gitDirectory })
  expect(manifestResult.success).toBe(true)
  if (!manifestResult.success) return

  writeFileSync(join(packageDirectory, "migrations", "0017_duplicate.sql"), "-- duplicate migration version\n")
  expect(await releaseVerify(packageDirectory)).toMatchObject({
    success: false,
    errorMessage: "Migration numbers must be unique.",
  })
})

test("deploy script gates live mutations behind predeploy verification", () => {
  const script = readFileSync(join(process.cwd(), "ops/deploy.sh"), "utf8")
  const predeployIndex = script.indexOf("predeploy_output=$(bun")
  expect(predeployIndex).toBeGreaterThanOrEqual(0)
  expect(script.indexOf('mkdir -p -- "$failure_root"')).toBeGreaterThan(predeployIndex)
  expect(
    script.indexOf('releaseRuntimeSnapshotCreate.ts" "$target_dir" "$previous_directory"', predeployIndex),
  ).toBeGreaterThan(predeployIndex)
  expect(script.indexOf('systemctl --user stop "$service_name"', predeployIndex)).toBeGreaterThan(predeployIndex)
  expect(script.indexOf(`rsync "\${rsync_options[@]}"`, predeployIndex)).toBeGreaterThan(predeployIndex)
  const deployPostdeployIndex = script.lastIndexOf("releasePostdeployVerify.ts")
  expect(script.indexOf('  --package "$package_dir"', deployPostdeployIndex)).toBeGreaterThan(deployPostdeployIndex)
  expect(script.indexOf('  --runtime "$target_dir"', deployPostdeployIndex)).toBeGreaterThan(deployPostdeployIndex)
  const restoreIndex = script.indexOf("releaseRuntimeSnapshotRestore.ts")
  const rollbackPostdeployIndex = script.indexOf("releasePostdeployVerify.ts", restoreIndex)
  expect(restoreIndex).toBeGreaterThan(predeployIndex)
  expect(rollbackPostdeployIndex).toBeGreaterThan(restoreIndex)
  expect(script).toContain("no prior packaged release exists")
  expect(script).toContain("rollback-postdeploy.log")
  expect(script.indexOf('mkdir -p -- "$target_dir"')).toBe(-1)
})
