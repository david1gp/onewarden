import type { Page } from "@playwright/test"

const authSessionFixture = {
  email: "user@example.com",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 3_600_000,
  userId: "user-id",
  kdf: 0,
  kdfIterations: 1,
  kdfMemory: null,
  kdfParallelism: null,
  encryptedUserKey: "wrapped-key",
}

export async function authBrowserFixtureCreate(page: Page): Promise<void> {
  await page.addInitScript((session) => {
    localStorage.setItem("onewarden_web_auth_session", JSON.stringify(session))
  }, authSessionFixture)
}
