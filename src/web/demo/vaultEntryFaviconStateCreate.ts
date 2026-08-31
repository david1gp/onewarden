import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultEntryFaviconPathResolve } from "./vaultEntryFaviconPathResolve.js"

export interface VaultEntryFaviconStateProps {
  url: () => string | undefined
  categoryIcon: () => string
  class?: string
}

interface VaultEntryFaviconImage {
  path: string
  generation: number
}

/** Resolves the favicon path and tracks load/error state for each rendered image instance. */
export function vaultEntryFaviconStateCreate(props: VaultEntryFaviconStateProps) {
  const failedImage = createSignalObject<VaultEntryFaviconImage | null>(null)
  const loadedImage = createSignalObject<VaultEntryFaviconImage | null>(null)
  const resolvedPath = createMemo(() => vaultEntryFaviconPathResolve(props.url()))
  let nextGeneration = 0

  const faviconImage = createMemo(() => {
    const path = resolvedPath()
    if (!path) return null
    nextGeneration += 1
    return { path, generation: nextGeneration }
  })

  const faviconPath = createMemo(() => {
    const image = faviconImage()
    if (!image) return null
    if (failedImage.get() === image) return null
    return image.path
  })

  const isLoaded = createMemo(() => {
    const image = faviconImage()
    return image !== null && faviconPath() !== null && loadedImage.get() === image
  })

  return {
    faviconImage,
    faviconPath,
    isLoaded,
    categoryIcon: props.categoryIcon,
    markLoaded: (image: VaultEntryFaviconImage) => {
      if (faviconImage() !== image) return
      loadedImage.set(image)
    },
    markFailed: (image: VaultEntryFaviconImage) => {
      if (faviconImage() !== image) return
      failedImage.set(image)
    },
  }
}
