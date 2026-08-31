import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import { webApiResponseEmptyParse } from "../../../shared/api/webApiResponseEmptyParse.js"
import { webApiResponseParse } from "../../../shared/api/webApiResponseParse.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type AdminConfig, adminConfigSchema } from "./adminConfigSchema.js"
import { type AdminDiagnostics, adminDiagnosticsSchema } from "./adminDiagnosticsSchema.js"
import { type AdminOrganization, adminOrganizationSchema } from "./adminOrganizationSchema.js"
import { type AdminUser, adminUserSchema } from "./adminUserSchema.js"

const adminUsersListSchema = v.array(adminUserSchema)
const adminOrganizationsListSchema = v.array(adminOrganizationSchema)

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function webAdminApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const baseUrl = options.baseUrl ?? ""
  const fetchImpl = options.fetch ?? fetch

  const login = async (token: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.login"
    let response: Response
    try {
      const formData = new FormData()
      formData.append("token", token)

      response = await fetchImpl(`${baseUrl}/admin/`, {
        method: "POST",
        body: formData,
      })
    } catch {
      return resultErrorCreate(op, "Network error during admin login.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    if (response.status === 401 || !response.ok) {
      return resultErrorCreate(op, "Invalid admin token, please try again.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }
    return resultCreate(undefined)
  }

  const logout = async (): Promise<Result<void>> => {
    const op = "webAdminApiClient.logout"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/logout`, {
        method: "GET",
      })
    } catch {
      return resultErrorCreate(op, "Network error during admin logout.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const usersList = async (): Promise<Result<AdminUser[]>> => {
    const op = "webAdminApiClient.usersList"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching admin users.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, adminUsersListSchema)
  }

  const userInvite = async (email: string): Promise<Result<AdminUser>> => {
    const op = "webAdminApiClient.userInvite"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      })
    } catch {
      return resultErrorCreate(op, "Network error inviting user.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, adminUserSchema)
  }

  const userDeauth = async (userId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.userDeauth"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/deauth`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error deauthorizing user sessions.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const userDisable = async (userId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.userDisable"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/disable`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error disabling user.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const userEnable = async (userId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.userEnable"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/enable`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error enabling user.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const userDelete = async (userId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.userDelete"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/delete`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting user.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const userRemove2fa = async (userId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.userRemove2fa"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/remove-2fa`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error removing user two-factor.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const userResendInvite = async (userId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.userResendInvite"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/users/${encodeURIComponent(userId)}/invite/resend`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error resending invite.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const organizationsList = async (): Promise<Result<AdminOrganization[]>> => {
    const op = "webAdminApiClient.organizationsList"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/organizations/overview`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching organizations.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, adminOrganizationsListSchema)
  }

  const diagnosticsGet = async (): Promise<Result<AdminDiagnostics>> => {
    const op = "webAdminApiClient.diagnosticsGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/diagnostics`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching diagnostics.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, adminDiagnosticsSchema)
  }

  const organizationDelete = async (orgId: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.organizationDelete"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/organizations/${encodeURIComponent(orgId)}/delete`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting organization.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const diagnosticsConfigGet = async (): Promise<Result<AdminConfig>> => {
    const op = "webAdminApiClient.diagnosticsConfigGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/diagnostics/config`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching configuration.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, adminConfigSchema)
  }

  const configUpdate = async (config: AdminConfig): Promise<Result<void>> => {
    const op = "webAdminApiClient.configUpdate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(config),
      })
    } catch {
      return resultErrorCreate(op, "Network error saving configuration.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const configDelete = async (): Promise<Result<void>> => {
    const op = "webAdminApiClient.configDelete"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/config/delete`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error resetting configuration.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const smtpTest = async (email: string): Promise<Result<void>> => {
    const op = "webAdminApiClient.smtpTest"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/test/smtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      })
    } catch {
      return resultErrorCreate(op, "Network error sending test email.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const backupDatabase = async (): Promise<Result<string>> => {
    const op = "webAdminApiClient.backupDatabase"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/admin/config/backup_db`, {
        method: "POST",
      })
    } catch {
      return resultErrorCreate(op, "Network error creating database backup.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    }
    const text = await response.text().catch(() => "Backup completed")
    return resultCreate(text)
  }

  return {
    login,
    logout,
    usersList,
    userInvite,
    userDeauth,
    userDisable,
    userEnable,
    userDelete,
    userRemove2fa,
    userResendInvite,
    organizationsList,
    organizationDelete,
    diagnosticsGet,
    diagnosticsConfigGet,
    configUpdate,
    configDelete,
    smtpTest,
    backupDatabase,
  }
}
