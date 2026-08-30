import { resolve } from "node:path"
import { type Result } from "#result"
import { type ReleaseManifest } from "../../src/server/release/releaseManifestSchema.js"
import { releasePackageValidate } from "./releasePackageValidate.js"

export async function releaseVerify(packageDirectory: string): Promise<Result<ReleaseManifest>> {
  return releasePackageValidate(resolve(packageDirectory))
}

if (import.meta.main) {
  const packageDirectory = process.argv[2]
  if (packageDirectory === undefined || process.argv.length > 3) {
    console.error("Usage: bun tools/release/releaseVerify.ts <package-directory>")
    process.exitCode = 1
  } else {
    const result = await releaseVerify(packageDirectory)
    if (!result.success) {
      console.error(`Release verification failed: ${result.errorMessage}`)
      process.exitCode = 1
    } else {
      console.log(`Release verification passed for ${result.data.application} ${result.data.releaseVersion}.`)
    }
  }
}
