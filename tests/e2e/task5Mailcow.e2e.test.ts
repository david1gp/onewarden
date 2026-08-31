import { expect, test } from "bun:test"
import { ImapFlow, type FetchMessageObject } from "imapflow"

type MailcowE2eConfig = {
  baseUrl: string
  imapHost: string
  imapMailbox: string
  imapPassword: string
  imapPollMilliseconds: number
  imapPort: number
  imapTimeoutMilliseconds: number
  imapUsername: string
  recipient: string
}

type MailcowE2eMessage = {
  body: string
  source: string
  subject: string
  uid: number
}

type MailcowE2eRegistration = {
  emailVerificationToken: string
  email: string
  kdf: number
  kdfIterations: number
  key: string
  masterPasswordHash: string
  name: string
}

const mailcowE2eConfig = mailcowE2eConfigResolve(process.env)

if (mailcowE2eConfig === undefined) {
  test.skip("Mailcow E2E requires ONEWARDEN_E2E_MAILCOW_ENABLED=true and all required documented variables", () => {})
} else {
  test("sends registration verification and Send OTP mail through OneWarden", async () => {
    const runTag = mailcowE2eRunTagCreate()
    const recipient = mailcowE2eTaggedAddressCreate(mailcowE2eConfig.recipient, runTag)
    const masterPasswordHash = `onewarden-e2e-password-${runTag}`
    const registration: MailcowE2eRegistration = {
      emailVerificationToken: "",
      email: recipient,
      kdf: 0,
      kdfIterations: 100_000,
      key: `onewarden-e2e-key-${runTag}`,
      masterPasswordHash,
      name: `OneWarden E2E ${runTag}`,
    }
    const ownedMessageUids = new Set<number>()
    let accessToken: string | undefined
    let sendId: string | undefined
    let cleanupFailed = false

    try {
      const verificationRequest = await mailcowE2eRequest(
        mailcowE2eConfig,
        "/identity/accounts/register/send-verification-email",
        {
          body: JSON.stringify({ email: recipient, name: registration.name }),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
      )
      expect(verificationRequest.status).toBe(204)

      const registrationImap = mailcowE2eImapClientCreate(mailcowE2eConfig)
      try {
        await registrationImap.connect()
        await registrationImap.mailboxOpen(mailcowE2eConfig.imapMailbox)

        const registrationMail = await mailcowE2eMessagePoll(
          registrationImap,
          recipient,
          "Verify Your Email",
          (body) => mailcowE2eRegistrationTokenRead(body, recipient, mailcowE2eConfig.baseUrl),
          mailcowE2eConfig,
          ownedMessageUids,
        )
        ownedMessageUids.add(registrationMail.uid)
        registration.emailVerificationToken = registrationMail.value
      } finally {
        await mailcowE2eImapClientClose(registrationImap)
      }

      const registrationResponse = await mailcowE2eRequest(mailcowE2eConfig, "/identity/accounts/register/finish", {
        body: JSON.stringify(registration),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      expect(registrationResponse.status).toBe(200)

      const loginResponse = await mailcowE2eRequest(mailcowE2eConfig, "/identity/connect/token", {
        body: new URLSearchParams({
          client_id: `onewarden-e2e-${runTag}`,
          device_identifier: `onewarden-e2e-device-${runTag}`,
          device_name: "OneWarden Mailcow E2E",
          device_type: "10",
          grant_type: "password",
          password: masterPasswordHash,
          scope: "api offline_access",
          username: recipient,
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      })
      expect(loginResponse.status).toBe(200)
      accessToken = mailcowE2eStringFieldRead(await mailcowE2eJsonRead(loginResponse, "login"), "access_token")

      const sendResponse = await mailcowE2eRequest(mailcowE2eConfig, "/api/sends", {
        body: JSON.stringify({
          deletionDate: new Date(Date.now() + 3_600_000).toISOString(),
          disabled: false,
          emails: recipient,
          file: null,
          hideEmail: false,
          key: `onewarden-e2e-send-key-${runTag}`,
          maxAccessCount: null,
          name: `OneWarden E2E Send ${runTag}`,
          notes: null,
          password: null,
          text: { text: `OneWarden E2E ${runTag}` },
          type: 0,
        }),
        headers: mailcowE2eJsonHeaders(accessToken),
        method: "POST",
      })
      expect(sendResponse.status).toBe(200)
      const send = await mailcowE2eJsonRead(sendResponse, "Send creation")
      sendId = mailcowE2eStringFieldRead(send, "id")
      const accessId = mailcowE2eStringFieldRead(send, "accessId")

      const sendOtpRequest = await mailcowE2eRequest(mailcowE2eConfig, "/identity/connect/token", {
        body: new URLSearchParams({
          client_id: `onewarden-e2e-${runTag}`,
          email: recipient,
          grant_type: "send_access",
          scope: "api.send.access",
          send_id: accessId,
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      })
      expect(sendOtpRequest.status).toBe(400)
      expect((await mailcowE2eJsonRead(sendOtpRequest, "Send OTP request")).send_access_error_type).toBe(
        "email_and_otp_required_otp_sent",
      )

      const otpImap = mailcowE2eImapClientCreate(mailcowE2eConfig)
      let otp: string
      try {
        await otpImap.connect()
        await otpImap.mailboxOpen(mailcowE2eConfig.imapMailbox)
        const otpMail = await mailcowE2eMessagePoll(
          otpImap,
          recipient,
          "OneWarden Send Verification Code",
          mailcowE2eOtpRead,
          mailcowE2eConfig,
          ownedMessageUids,
        )
        ownedMessageUids.add(otpMail.uid)
        otp = otpMail.value
      } finally {
        await mailcowE2eImapClientClose(otpImap)
      }

      const sendAccessRequest = await mailcowE2eRequest(mailcowE2eConfig, "/identity/connect/token", {
        body: new URLSearchParams({
          client_id: `onewarden-e2e-${runTag}`,
          email: recipient,
          grant_type: "send_access",
          otp,
          scope: "api.send.access",
          send_id: accessId,
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      })
      expect(sendAccessRequest.status).toBe(200)
      const sendAccessToken = mailcowE2eStringFieldRead(
        await mailcowE2eJsonRead(sendAccessRequest, "Send OTP consumption"),
        "access_token",
      )

      const sendAccessResponse = await mailcowE2eRequest(mailcowE2eConfig, "/api/sends/access", {
        headers: { authorization: `Bearer ${sendAccessToken}` },
        method: "POST",
      })
      expect(sendAccessResponse.status).toBe(200)
    } finally {
      try {
        await mailcowE2eOwnedDataDelete(mailcowE2eConfig, accessToken, sendId, masterPasswordHash)
      } catch {
        cleanupFailed = true
      }
      try {
        await mailcowE2eOwnedMessagesDelete(mailcowE2eConfig, ownedMessageUids, recipient)
      } catch {
        cleanupFailed = true
      }
    }
    if (cleanupFailed) throw new Error("Mailcow E2E cleanup failed.")
  })
}

function mailcowE2eConfigResolve(environment: Record<string, string | undefined>): MailcowE2eConfig | undefined {
  if (environment.ONEWARDEN_E2E_MAILCOW_ENABLED !== "true") return undefined

  const baseUrlValue = environment.ONEWARDEN_E2E_BASE_URL
  const recipient = environment.ONEWARDEN_E2E_RECIPIENT
  const imapHost = environment.ONEWARDEN_E2E_IMAP_HOST
  const imapPortValue = environment.ONEWARDEN_E2E_IMAP_PORT
  const imapUsername = environment.ONEWARDEN_E2E_IMAP_USERNAME
  const imapPassword = environment.ONEWARDEN_E2E_IMAP_PASSWORD
  const imapMailbox = environment.ONEWARDEN_E2E_IMAP_MAILBOX
  if (
    baseUrlValue === undefined ||
    recipient === undefined ||
    imapHost === undefined ||
    imapPortValue === undefined ||
    imapUsername === undefined ||
    imapPassword === undefined ||
    imapMailbox === undefined ||
    baseUrlValue.trim() === "" ||
    recipient.trim() === "" ||
    imapHost.trim() === "" ||
    imapPortValue.trim() === "" ||
    imapUsername.trim() === "" ||
    imapPassword.length === 0 ||
    imapMailbox.trim() === ""
  )
    return undefined

  let baseUrl: URL
  try {
    baseUrl = new URL(baseUrlValue)
  } catch {
    return undefined
  }
  if (
    (baseUrl.protocol !== "https:" &&
      !(baseUrl.protocol === "http:" && (baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1"))) ||
    baseUrl.username !== "" ||
    baseUrl.password !== "" ||
    baseUrl.pathname !== "/" ||
    baseUrl.search !== "" ||
    baseUrl.hash !== ""
  )
    return undefined

  const imapPort = Number(imapPortValue)
  if (!Number.isSafeInteger(imapPort) || imapPort < 1 || imapPort > 65_535) return undefined
  const imapTimeoutMilliseconds = mailcowE2eSecondsResolve(environment.ONEWARDEN_E2E_IMAP_TIMEOUT_SECONDS, 120)
  const imapPollMilliseconds = mailcowE2eSecondsResolve(environment.ONEWARDEN_E2E_IMAP_POLL_SECONDS, 2)
  if (imapTimeoutMilliseconds === undefined || imapPollMilliseconds === undefined) return undefined
  if (!mailcowE2eEmailIsValid(recipient)) return undefined
  return {
    baseUrl: baseUrl.origin,
    imapHost,
    imapMailbox,
    imapPassword,
    imapPollMilliseconds,
    imapPort,
    imapTimeoutMilliseconds,
    imapUsername,
    recipient,
  }
}

function mailcowE2eSecondsResolve(value: string | undefined, defaultValue: number): number | undefined {
  if (value === undefined || value.trim() === "") return defaultValue * 1_000
  const seconds = Number(value)
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 600) return undefined
  return seconds * 1_000
}

function mailcowE2eEmailIsValid(value: string): boolean {
  const at = value.lastIndexOf("@")
  return at > 0 && at === value.indexOf("@") && at < value.length - 1 && !/[\s<>]/u.test(value)
}

function mailcowE2eRunTagCreate(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
}

function mailcowE2eTaggedAddressCreate(address: string, tag: string): string {
  const at = address.lastIndexOf("@")
  return `${address.slice(0, at)}+onewarden-e2e-${tag}${address.slice(at)}`
}

async function mailcowE2eRequest(config: MailcowE2eConfig, path: string, init: RequestInit): Promise<Response> {
  return fetch(new URL(path, config.baseUrl).toString(), init)
}

function mailcowE2eJsonHeaders(accessToken: string): HeadersInit {
  return { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }
}

async function mailcowE2eJsonRead(response: Response, operation: string): Promise<Record<string, unknown>> {
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new Error(`${operation} returned invalid JSON.`)
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${operation} returned an invalid response.`)
  return value as Record<string, unknown>
}

function mailcowE2eStringFieldRead(value: Record<string, unknown>, field: string): string {
  const fieldValue = value[field]
  if (typeof fieldValue !== "string" || fieldValue.length === 0) throw new Error(`Response field ${field} is missing.`)
  return fieldValue
}

function mailcowE2eImapClientCreate(config: MailcowE2eConfig): ImapFlow {
  return new ImapFlow({
    auth: { pass: config.imapPassword, user: config.imapUsername },
    connectionTimeout: config.imapTimeoutMilliseconds,
    host: config.imapHost,
    logger: false,
    port: config.imapPort,
    secure: true,
    socketTimeout: config.imapTimeoutMilliseconds,
    tls: { rejectUnauthorized: true, servername: config.imapHost },
  })
}

async function mailcowE2eImapClientClose(client: ImapFlow): Promise<void> {
  if (!client.usable) {
    client.close()
    return
  }
  try {
    await client.logout()
  } catch {
    client.close()
  }
}

async function mailcowE2eMessagePoll(
  client: ImapFlow,
  recipient: string,
  subject: string,
  valueRead: (body: string) => string | undefined,
  config: MailcowE2eConfig,
  ownedMessageUids: Set<number>,
): Promise<{ uid: number; value: string }> {
  const deadline = Date.now() + config.imapTimeoutMilliseconds
  while (Date.now() < deadline) {
    const uidResult = await client.search({ text: recipient }, { uid: true })
    const candidateUids = uidResult === false ? [] : uidResult
    const uids = candidateUids.length > 0 ? candidateUids : await mailcowE2eAllMessageUidsRead(client)
    for (const uid of uids) {
      const message = await mailcowE2eMessageRead(client, uid)
      if (message === undefined) continue
      if (!message.source.toLowerCase().includes(recipient.toLowerCase())) continue
      if (message.subject !== subject) continue
      ownedMessageUids.add(message.uid)
      const value = valueRead(message.body)
      if (value !== undefined) return { uid: message.uid, value }
    }
    const remainingMilliseconds = deadline - Date.now()
    if (remainingMilliseconds <= 0) break
    await Bun.sleep(Math.min(config.imapPollMilliseconds, remainingMilliseconds))
  }
  throw new Error(`Timed out waiting for the tagged ${subject} message.`)
}

async function mailcowE2eAllMessageUidsRead(client: ImapFlow): Promise<number[]> {
  const result = await client.search({ all: true }, { uid: true })
  return result === false ? [] : result
}

async function mailcowE2eMessageRead(client: ImapFlow, uid: number): Promise<MailcowE2eMessage | undefined> {
  const fetched: FetchMessageObject | false = await client.fetchOne(String(uid), { source: true }, { uid: true })
  if (fetched === false || fetched.source === undefined) return undefined
  const source = fetched.source.toString("utf8")
  return {
    body: mailcowE2eMimeBodyRead(source),
    source,
    subject: mailcowE2eHeaderRead(source, "subject") ?? "",
    uid: fetched.uid,
  }
}

function mailcowE2eRegistrationTokenRead(body: string, recipient: string, expectedOrigin: string): string | undefined {
  const urlCandidates = body.match(/https?:\/\/[^\s<>"']+/gu) ?? []
  for (const candidate of urlCandidates) {
    const normalizedCandidate = candidate.replaceAll("&amp;", "&").replace(/[.,;:)]+$/u, "")
    let url: URL
    try {
      url = new URL(normalizedCandidate)
    } catch {
      continue
    }
    if (url.origin !== expectedOrigin || !url.hash.startsWith("#/finish-signup/")) continue
    const querySeparator = url.hash.indexOf("?")
    if (querySeparator < 0) continue
    const query = new URLSearchParams(url.hash.slice(querySeparator + 1))
    if (query.get("email") !== recipient) continue
    const token = query.get("token")
    if (token !== null && token.length > 0) return token
  }
  return undefined
}

function mailcowE2eOtpRead(body: string): string | undefined {
  const values = new Set(body.match(/\b\d{4,8}\b/gu) ?? [])
  if (values.size !== 1) return undefined
  return values.values().next().value
}

function mailcowE2eHeaderRead(source: string, name: string): string | undefined {
  const lines = source.split(/\r?\n/u)
  const lowerName = name.toLowerCase()
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const separator = line?.indexOf(":") ?? -1
    if (line === undefined || separator < 0 || line.slice(0, separator).toLowerCase() !== lowerName) continue
    const values = [line.slice(separator + 1).trim()]
    for (let next = index + 1; next < lines.length && /^[ \t]/u.test(lines[next] ?? ""); next += 1)
      values.push((lines[next] ?? "").trim())
    return values.join(" ")
  }
  return undefined
}

function mailcowE2eMimeBodyRead(source: string): string {
  const headerEnd = source.search(/\r?\n\r?\n/u)
  if (headerEnd < 0) return ""
  const header = source.slice(0, headerEnd)
  const body = source.slice(headerEnd).replace(/^\r?\n\r?\n/u, "")
  const contentType = mailcowE2eHeaderRead(`${header}\n`, "content-type") ?? ""
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/iu.exec(contentType)
  if (boundaryMatch !== null) {
    const boundary = boundaryMatch[1] ?? boundaryMatch[2]
    if (boundary !== undefined) {
      return body
        .split(`--${boundary}`)
        .filter((part) => part.trim() !== "" && part.trim() !== "--")
        .map((part) => mailcowE2eMimeBodyRead(part))
        .filter((part) => part !== "")
        .join("\n")
    }
  }
  return mailcowE2eTransferDecode(body, mailcowE2eHeaderRead(`${header}\n`, "content-transfer-encoding"))
}

function mailcowE2eTransferDecode(value: string, encoding: string | undefined): string {
  const normalizedEncoding = encoding?.toLowerCase() ?? ""
  if (normalizedEncoding === "base64") return Buffer.from(value.replaceAll(/\s/gu, ""), "base64").toString("utf8")
  if (normalizedEncoding !== "quoted-printable") return value
  const unwrapped = value.replaceAll(/=\r?\n/gu, "").replaceAll(/=([0-9a-f]{2})/giu, (_, hex: string) => {
    return String.fromCharCode(Number.parseInt(hex, 16))
  })
  return Buffer.from(unwrapped, "latin1").toString("utf8")
}

async function mailcowE2eOwnedDataDelete(
  config: MailcowE2eConfig,
  accessToken: string | undefined,
  sendId: string | undefined,
  masterPasswordHash: string,
): Promise<void> {
  if (accessToken === undefined) return
  if (sendId !== undefined) {
    const sendDeleteResponse = await mailcowE2eRequest(config, `/api/sends/${encodeURIComponent(sendId)}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      method: "DELETE",
    })
    if (!sendDeleteResponse.ok) throw new Error(`Send cleanup failed with status ${sendDeleteResponse.status}.`)
  }
  const accountDeleteResponse = await mailcowE2eRequest(config, "/api/accounts", {
    body: JSON.stringify({ masterPasswordHash }),
    headers: mailcowE2eJsonHeaders(accessToken),
    method: "DELETE",
  })
  if (!accountDeleteResponse.ok) throw new Error(`Account cleanup failed with status ${accountDeleteResponse.status}.`)
}

async function mailcowE2eOwnedMessagesDelete(
  config: MailcowE2eConfig,
  uids: Set<number>,
  recipient: string,
): Promise<void> {
  if (uids.size === 0) return
  const client = mailcowE2eImapClientCreate(config)
  try {
    await client.connect()
    await client.mailboxOpen(config.imapMailbox)
    for (const uid of uids) {
      const message = await mailcowE2eMessageRead(client, uid)
      if (
        message === undefined ||
        !message.source.toLowerCase().includes(recipient.toLowerCase()) ||
        !new Set(["Verify Your Email", "OneWarden Send Verification Code"]).has(message.subject)
      )
        throw new Error("Test-owned IMAP message verification failed.")
    }
    const deleteResult = await client.messageDelete([...uids], { uid: true })
    if (!deleteResult) throw new Error("Test-owned IMAP message deletion was rejected.")
  } finally {
    await mailcowE2eImapClientClose(client)
  }
}
