import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { upstreamRouteManifestGenerate } from "./upstreamRouteManifestGenerate.js"

const defaultReferenceRoot = "/home/david/opensource/vaultwarden"
const defaultManifestPath = "tools/compatibility/upstream-route-manifest.json"

export async function upstreamRouteManifestCheck(
  referenceRoot = defaultReferenceRoot,
  manifestPath = defaultManifestPath,
): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "onewarden-route-manifest-"))
  const generatedPath = join(temporaryDirectory, "manifest.json")

  try {
    await upstreamRouteManifestGenerate(referenceRoot, generatedPath)
    const [generated, checkedIn] = await Promise.all([readFile(generatedPath, "utf8"), readFile(manifestPath, "utf8")])
    if (generated !== checkedIn) {
      throw new Error(
        `Checked-in route manifest is stale. Regenerate ${manifestPath} from ${referenceRoot} and review the route changes.`,
      )
    }
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}

if (import.meta.main) await upstreamRouteManifestCheck()
