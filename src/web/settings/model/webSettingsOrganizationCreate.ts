import type { Result } from "#result"
import { bitwardenCipherStringDecrypt } from "../../../shared/crypto/bitwardenCipherStringDecrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../../organizations/api/organizationApiClientCreate.js"

const USER_KEY_LENGTH = 64

export function webSettingsOrganizationCreate(options: {
  apiClient?: ReturnType<typeof organizationApiClientCreate>
  session: ReturnType<typeof webAuthSessionCreate>
}) {
  const session = options.session
  const apiClient =
    options.apiClient ?? organizationApiClientCreate({ token: () => session.session()?.accessToken ?? null })

  const organizationList = async (): Promise<Result<Array<{ id: string; key: string | null; name: string }>>> => {
    const op = "webSettingsOrganization.organizationList"
    if (session.session() === null) {
      return resultErrorCreate(op, "You must be logged in to load organizations.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }

    const organizationsResult = await apiClient.organizationList()
    if (!organizationsResult.success) return organizationsResult

    return resultCreate(
      organizationsResult.data.map((organization) => ({
        id: organization.id,
        key: organization.key ?? null,
        name: organization.name,
      })),
    )
  }

  const organizationKeyResolve = async (organizationId: string): Promise<Result<Uint8Array>> => {
    const op = "webSettingsOrganization.organizationKeyResolve"
    if (session.session() === null) {
      return resultErrorCreate(op, "You must be logged in to resolve an organization key.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }
    if (organizationId.length === 0) {
      return resultErrorCreate(op, "Organization id must not be empty.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const accountUserKey = session.getUserKey()
    if (accountUserKey === null) {
      return resultErrorCreate(op, "Vault is locked.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }
    if (accountUserKey.byteLength !== USER_KEY_LENGTH) {
      return resultErrorCreate(op, "Account user key is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const userKey = accountUserKey.slice()
    try {
      const organizationsResult = await organizationList()
      if (!organizationsResult.success) return organizationsResult
      const organization = organizationsResult.data.find((item) => item.id === organizationId)
      if (organization === undefined) {
        return resultErrorCreate(op, "Selected organization was not found.", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      if (organization.key === null) {
        return resultErrorCreate(op, "Selected organization key is missing.", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      if (typeof organization.key !== "string" || organization.key.length === 0) {
        return resultErrorCreate(op, "Selected organization key is malformed.", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }

      const decryptedKeyResult = await bitwardenCipherStringDecrypt(organization.key, userKey)
      if (!decryptedKeyResult.success) return decryptedKeyResult
      if (decryptedKeyResult.data.byteLength !== USER_KEY_LENGTH) {
        decryptedKeyResult.data.fill(0)
        return resultErrorCreate(op, "Selected organization key is malformed.", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }

      const organizationKey = decryptedKeyResult.data.slice()
      decryptedKeyResult.data.fill(0)
      return resultCreate(organizationKey)
    } finally {
      userKey.fill(0)
    }
  }

  return { organizationKeyResolve, organizationList }
}
