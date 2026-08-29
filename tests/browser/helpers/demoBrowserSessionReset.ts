import type { Page } from "@playwright/test"

const demoBrowserSessionMarker = "onewarden_task7_demo_session_initialized"

export async function demoBrowserSessionReset(page: Page): Promise<void> {
  await page.addInitScript((marker) => {
    if (window.sessionStorage.getItem(marker) === null) {
      window.sessionStorage.clear()
      window.sessionStorage.setItem(marker, "true")
    }
  }, demoBrowserSessionMarker)
}
