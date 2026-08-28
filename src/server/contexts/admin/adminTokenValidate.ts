import { type Result } from "#result"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export async function adminTokenValidate(token: string, configuredToken: string | undefined): Promise<Result<boolean>> {
  const normalizedToken = token.trim()
  if (configuredToken === undefined || configuredToken.trim() === "") return resultCreate(false)
  const normalizedConfiguredToken = configuredToken.trim()
  if (!normalizedConfiguredToken.startsWith("$argon2"))
    return resultCreate(constantTimeStringsEqual(normalizedConfiguredToken, normalizedToken))

  try {
    return resultCreate(await Bun.password.verify(normalizedToken, normalizedConfiguredToken))
  } catch {
    return resultCreate(false)
  }
}
