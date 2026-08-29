import type { Page } from "@playwright/test"

export const browserAuthenticatedSessionMasterPassword = "browser-test-master-password"

const browserAuthenticatedSessionEncryptedUserKey =
  "2.EQavrUsu9Dmfy9G0APwMiw==|jKtp2d+Ci1ZE4l1Blce5RRMkM61y+zc8ROYmkgGLhm2r8qGwby0+8pjFKcKTl4AYYGaBXAxPzDZJWcq3DMYCQUo/qgbApI5Loii5WulA6Uk=|Y1zA1v8ngKLSY8iRg5S5RPRKT8aGAkhKHSLd1RLJ85o="

export async function browserAuthenticatedSessionSetup(
  page: Page,
  sessionOverrides: Record<string, unknown> = {},
): Promise<void> {
  const session = {
    email: "user@example.com",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    tokenType: "Bearer",
    expiresAt: Date.parse("2099-01-01T00:00:00.000Z"),
    userId: "11111111-1111-4111-8111-111111111111",
    kdf: 0,
    kdfIterations: 1,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: browserAuthenticatedSessionEncryptedUserKey,
    ...sessionOverrides,
  }

  await page.addInitScript(
    ({ session: sessionValue }) => {
      localStorage.setItem("onewarden_web_auth_session", JSON.stringify(sessionValue))
    },
    { session },
  )
}

export async function browserAuthenticatedSessionUnlock(page: Page): Promise<void> {
  await page.getByRole("textbox", { name: "Master Password" }).fill(browserAuthenticatedSessionMasterPassword)
  await page.getByRole("button", { name: "Unlock Vault" }).click()
  await page.getByRole("button", { name: "Unlock Vault" }).waitFor({ state: "detached" })
}
