import { isAbsolute, relative, resolve, sep } from "node:path"

export function webFilePathResolve(folder: string, requestedPath: string): string | undefined {
  if (requestedPath.length === 0) return undefined
  const folderPath = resolve(folder)
  const path = resolve(folderPath, requestedPath)
  const relativePath = relative(folderPath, path)
  if (
    relativePath.length === 0 ||
    isAbsolute(relativePath) ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    return undefined
  }
  return path
}
