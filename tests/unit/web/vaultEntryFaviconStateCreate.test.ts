import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { vaultEntryFaviconStateCreate } from "../../../src/web/demo/vaultEntryFaviconStateCreate.js"

test("vaultEntryFaviconStateCreate exposes the resolved path and hides the category icon once loaded", () => {
  createRoot((dispose) => {
    const state = vaultEntryFaviconStateCreate({
      url: () => "https://Example.com/login",
      categoryIcon: () => "M0 0",
    })

    expect(state.faviconPath()).toBe("/icons/example.com/icon.png?fallback=error")
    expect(state.isLoaded()).toBe(false)

    state.markLoaded(state.faviconImage()!)
    expect(state.isLoaded()).toBe(true)

    dispose()
  })
})

test("vaultEntryFaviconStateCreate requests no favicon for missing or unsupported URLs", () => {
  createRoot((dispose) => {
    const [url, setUrl] = createSignal<string | undefined>(undefined)
    const state = vaultEntryFaviconStateCreate({ url, categoryIcon: () => "M0 0" })

    expect(state.faviconPath()).toBeNull()

    setUrl("ssh://bastion.example.net:2222")
    expect(state.faviconPath()).toBeNull()
    expect(state.isLoaded()).toBe(false)

    dispose()
  })
})

test("vaultEntryFaviconStateCreate falls back on error and resets when the URL changes", () => {
  createRoot((dispose) => {
    const [url, setUrl] = createSignal<string | undefined>("https://example.com")
    const state = vaultEntryFaviconStateCreate({ url, categoryIcon: () => "M0 0" })

    state.markLoaded(state.faviconImage()!)
    state.markFailed(state.faviconImage()!)
    expect(state.faviconPath()).toBeNull()
    expect(state.isLoaded()).toBe(false)

    setUrl("https://other.example.com/login")
    expect(state.faviconPath()).toBe("/icons/other.example.com/icon.png?fallback=error")
    expect(state.isLoaded()).toBe(false)

    dispose()
  })
})

test("vaultEntryFaviconStateCreate ignores events from a previous image", () => {
  createRoot((dispose) => {
    const [url, setUrl] = createSignal<string | undefined>("https://example.com")
    const state = vaultEntryFaviconStateCreate({ url, categoryIcon: () => "M0 0" })
    const previousImage = state.faviconImage()!
    const currentPath = "/icons/other.example.com/icon.png?fallback=error"

    setUrl("https://other.example.com/login")
    state.markFailed(previousImage)
    state.markLoaded(previousImage)

    expect(state.faviconPath()).toBe(currentPath)
    expect(state.isLoaded()).toBe(false)

    state.markLoaded(state.faviconImage()!)
    expect(state.isLoaded()).toBe(true)

    state.markFailed(previousImage)
    expect(state.faviconPath()).toBe(currentPath)
    expect(state.isLoaded()).toBe(true)

    dispose()
  })
})

test("vaultEntryFaviconStateCreate ignores a detached first A image load after A to B to A", () => {
  createRoot((dispose) => {
    const [url, setUrl] = createSignal<string | undefined>("https://example.com")
    const state = vaultEntryFaviconStateCreate({ url, categoryIcon: () => "M0 0" })
    const firstA = state.faviconImage()!

    setUrl("https://other.example.com")
    setUrl("https://example.com")
    const secondA = state.faviconImage()!

    expect(secondA).not.toBe(firstA)
    state.markLoaded(firstA)

    expect(state.faviconPath()).toBe(firstA.path)
    expect(state.isLoaded()).toBe(false)

    state.markLoaded(secondA)
    expect(state.isLoaded()).toBe(true)

    dispose()
  })
})

test("vaultEntryFaviconStateCreate ignores a detached first A image error after A to B to A", () => {
  createRoot((dispose) => {
    const [url, setUrl] = createSignal<string | undefined>("https://example.com")
    const state = vaultEntryFaviconStateCreate({ url, categoryIcon: () => "M0 0" })
    const firstA = state.faviconImage()!

    setUrl("https://other.example.com")
    setUrl("https://example.com")
    const secondA = state.faviconImage()!

    expect(secondA).not.toBe(firstA)
    state.markFailed(firstA)

    expect(state.faviconPath()).toBe(firstA.path)
    expect(state.isLoaded()).toBe(false)

    state.markLoaded(secondA)
    expect(state.isLoaded()).toBe(true)

    dispose()
  })
})
