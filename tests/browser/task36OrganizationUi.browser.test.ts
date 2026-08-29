import { expect, type Page, type Route, test } from "@playwright/test"
import { organizationDemoData } from "../../src/web/organizations/demo/organizationDemoData.js"

const organizationId = "org-acme-corp-001"

function organizationApiStateCreate() {
  return structuredClone(organizationDemoData)
}

async function responseJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    status,
  })
}

async function setupOrganizationApi(page: Page) {
  const state = organizationApiStateCreate()
  await page.route("**/api/**", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (!path.startsWith("/api/")) return route.continue()
    const parts = path.split("/").filter(Boolean)
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined

    if (path === "/api/sync") return responseJson(route, { profile: { organizations: state.organizations } })
    if (path.endsWith("/users/invite")) {
      const emails = String(body?.emails ?? "")
        .split(/[\s,]+/)
        .filter(Boolean)
      for (const email of emails) {
        state.members.push({
          accessAll: false,
          collections: [],
          email,
          externalId: null,
          id: `mem-${state.members.length + 1}`,
          name: email.split("@")[0] ?? email,
          status: 0,
          twoFactorEnabled: false,
          type: Number(body?.type ?? 2) as 0 | 1 | 2 | 3 | 4,
          userId: null,
        })
      }
      return responseJson(route, {})
    }
    if (parts.includes("users") && parts.at(-1) === "revoke") {
      const member = state.members.find((item) => item.id === parts.at(-2))
      if (member) member.status = -1
      return responseJson(route, {})
    }
    if (parts.includes("users") && (parts.at(-1) === "restore" || parts.at(-1) === "vnext")) {
      const memberId = parts.at(-1) === "vnext" ? parts.at(-3) : parts.at(-2)
      const member = state.members.find((item) => item.id === memberId)
      if (member) member.status = 2
      return responseJson(route, {})
    }
    if (parts.includes("users") && request.method() === "DELETE") {
      const memberId = parts.at(-1)
      state.members = state.members.filter((item) => item.id !== memberId)
      return responseJson(route, {})
    }
    if (parts.includes("users") && request.method() === "PUT") {
      const member = state.members.find((item) => item.id === parts.at(-1))
      if (member) member.type = Number(body?.type ?? member.type) as 0 | 1 | 2 | 3 | 4
      return responseJson(route, {})
    }
    if (path.endsWith("/users") && request.method() === "GET") return responseJson(route, { data: state.members })

    if (path.endsWith("/collections/details") || (path.endsWith("/collections") && request.method() === "GET")) {
      return responseJson(route, { data: state.collections })
    }
    if (path.endsWith("/collections") && request.method() === "POST") {
      const collection = {
        externalId: body?.externalId ?? null,
        hidePasswords: false,
        id: `col-created-${state.collections.length + 1}`,
        manage: true,
        manageAll: false,
        name: String(body?.name ?? "New Collection"),
        organizationId,
        readOnly: false,
        users: body?.users ?? [],
      }
      state.collections.push(collection as (typeof state.collections)[number])
      return responseJson(route, collection)
    }
    if (parts.includes("collections") && request.method() === "PUT") {
      const collection = state.collections.find((item) => item.id === parts.at(-1))
      if (collection)
        Object.assign(collection, { externalId: body?.externalId ?? null, name: body?.name, users: body?.users ?? [] })
      return responseJson(route, collection ?? {})
    }
    if (parts.includes("collections") && request.method() === "DELETE") {
      state.collections = state.collections.filter((item) => item.id !== parts.at(-1))
      return responseJson(route, {})
    }

    if (path.endsWith("/groups/details") || (path.endsWith("/groups") && request.method() === "GET")) {
      return responseJson(route, { data: state.groups })
    }
    if (path.endsWith("/groups") && request.method() === "POST") {
      const group = {
        accessAll: Boolean(body?.accessAll),
        collections: body?.collections ?? [],
        externalId: body?.externalId ?? null,
        id: `grp-created-${state.groups.length + 1}`,
        name: String(body?.name ?? "New Group"),
        organizationId,
        users: body?.users ?? [],
      }
      state.groups.push(group as (typeof state.groups)[number])
      return responseJson(route, group)
    }
    if (parts.includes("groups") && path.endsWith("/users") && request.method() === "PUT") {
      const group = state.groups.find((item) => item.id === parts.at(-2))
      if (group) group.users = (body as unknown as string[]) ?? []
      return responseJson(route, {})
    }
    if (parts.includes("groups") && request.method() === "PUT") {
      const group = state.groups.find((item) => item.id === parts.at(-1))
      if (group) Object.assign(group, body)
      return responseJson(route, group ?? {})
    }
    if (parts.includes("groups") && request.method() === "DELETE") {
      state.groups = state.groups.filter((item) => item.id !== parts.at(-1))
      return responseJson(route, {})
    }
    if (path.endsWith("/policies") && request.method() === "GET") return responseJson(route, { data: state.policies })
    if (parts.includes("policies") && request.method() === "PUT") {
      const policy = state.policies.find((item) => item.type === Number(parts.at(-1)))
      const policyInput = (body?.policy ?? {}) as Record<string, unknown>
      if (policy) Object.assign(policy, { enabled: policyInput.enabled, data: policyInput.data })
      return responseJson(route, policy ?? {})
    }
    if (path.endsWith("/events")) {
      const memberId = parts.at(-2)
      const continuation = url.searchParams.get("continuationToken")
      let events = memberId === "users" ? state.events : state.events
      if (parts.includes("users"))
        events = events.filter((item) => item.userId === memberId || item.actingUserId === memberId)
      return responseJson(route, {
        continuationToken: continuation ? null : "page-2",
        data: continuation ? events.slice(2) : events.slice(0, 2),
      })
    }
    if (path.endsWith("/domain") && request.method() === "GET") return responseJson(route, { data: state.domains })
    if (path.endsWith("/domain") && request.method() === "POST") {
      const domain = {
        creationDate: "2026-08-29T00:00:00.000Z",
        domainName: String(body?.domainName ?? "example.com"),
        id: `domain-created-${state.domains.length + 1}`,
        txt: "onewarden-verification=deterministic",
        verifiedDate: null,
      }
      state.domains.push(domain as (typeof state.domains)[number])
      return responseJson(route, domain)
    }
    if (parts.includes("domain") && parts.at(-1) === "verify") {
      const domain = state.domains.find((item) => item.id === parts.at(-2))
      if (domain) domain.verifiedDate = "2026-08-29T00:00:00.000Z"
      return responseJson(route, domain ?? {})
    }
    if (parts.includes("domain") && request.method() === "DELETE") {
      state.domains = state.domains.filter((item) => item.id !== parts.at(-1))
      return responseJson(route, {})
    }
    if (path.endsWith("/sso") && request.method() === "GET") return responseJson(route, state.sso)
    if (path.endsWith("/sso") && request.method() === "POST") {
      state.sso = {
        Data: body?.data as Record<string, unknown> | null,
        Enabled: Boolean(body?.enabled),
        Identifier: String(body?.identifier ?? ""),
        Urls: state.sso.Urls,
      }
      return responseJson(route, state.sso)
    }
    if (path === "/api/organizations" && request.method() === "POST") {
      const organization = {
        billingEmail: String(body?.billingEmail ?? "billing@example.com"),
        hasPublicAndPrivateKeys: true,
        id: "org-created-003",
        identifier: "deterministic-org",
        key: "0|deterministic-key",
        maxCollections: 20,
        maxStorageGb: 5,
        name: String(body?.name ?? "New Organization"),
        planType: 6,
        seats: 10,
        status: 2,
        type: 0,
      }
      state.organizations.push(organization)
      return responseJson(route, organization)
    }
    if (parts.length === 3 && parts[1] === "organizations" && request.method() === "PUT") {
      const organization = state.organizations.find((item) => item.id === parts[2])
      if (organization) Object.assign(organization, body)
      return responseJson(route, organization ?? {})
    }
    return responseJson(route, {})
  })
}

test.describe("task 36 organization management UI", () => {
  test.beforeEach(async ({ page }) => {
    await setupOrganizationApi(page)
  })

  test("creates an organization and saves organization settings", async ({ page }) => {
    await page.goto("/organizations?tab=settings")
    await expect(page.getByRole("heading", { name: "Organization Settings" })).toBeVisible()
    await page.getByLabel("Organization Name").fill("Acme Corporation QA")
    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByRole("status")).toContainText("Organization updated successfully.")

    await page.getByRole("button", { name: "New Org" }).click()
    await page.getByLabel("Organization Name").last().fill("Deterministic Org")
    await page.getByLabel("Billing Email").last().fill("deterministic@example.com")
    await page.getByRole("button", { name: "Create Organization" }).click()
    await expect(page.getByRole("combobox", { name: "Select Organization" })).toContainText("Deterministic Org")
  })

  test("invites, updates, removes, revokes, and restores members", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept())
    await page.goto("/organizations?tab=members")
    await page.getByRole("button", { name: "Invite members", exact: true }).click()
    await page.getByLabel("Email Addresses (separated by commas or newlines)").fill("new.member@example.com")
    await page.getByRole("button", { name: "Send Invitations" }).click()
    await expect(page.getByRole("status")).toContainText("Member invitation(s) sent successfully.")
    await expect(page.getByRole("button", { name: /new\.member@example\.com/ })).toBeVisible()

    await page.getByRole("button", { name: /new\.member@example\.com/ }).click()
    await page.getByRole("button", { name: "Edit Role & Permissions" }).click()
    await page.getByRole("combobox", { name: "Organization Role" }).selectOption("2")
    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByRole("status")).toContainText("Member permissions updated.")

    await page.getByRole("button", { name: "Remove from Org" }).click()
    await expect(page.getByRole("button", { name: /new\.member@example\.com/ })).toHaveCount(0)
    await page.getByRole("button", { name: /Bob Stone/ }).click()
    await page.getByRole("button", { name: "Revoke Access" }).click()
    await expect(page.getByRole("button", { name: "Restore Access" })).toBeVisible()
    await page.getByRole("button", { name: "Restore Access" }).click()
    await expect(page.getByRole("button", { name: "Revoke Access" })).toBeVisible()
  })

  test("performs collection CRUD and assignment changes", async ({ page }) => {
    await page.goto("/organizations?tab=collections")
    await page.getByRole("button", { name: "New Collection" }).click()
    await page.getByLabel("Collection Name").fill("Deterministic Collection")
    await page.getByLabel("External ID (Optional)").fill("COL-DET")
    await page.getByRole("dialog").getByText("Alice Wright", { exact: true }).click()
    await page.getByRole("button", { name: "Create Collection" }).click()
    await expect(page.getByRole("status")).toContainText("Collection created successfully.")
    await expect(page.getByRole("button", { name: /Deterministic Collection/ })).toBeVisible()
    await page.getByRole("button", { name: /Deterministic Collection/ }).click()
    await page.getByRole("button", { name: "Edit Collection" }).click()
    await page.getByLabel("Collection Name").fill("Deterministic Collection Updated")
    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByRole("status")).toContainText("Collection updated.")
    await page.getByRole("button", { name: "Delete Collection" }).click()
    await expect(page.getByRole("status")).toContainText("Collection deleted.")
  })

  test("performs group CRUD, membership, and collection access", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept())
    await page.goto("/organizations?tab=groups")
    await page.getByRole("button", { name: "New Group" }).click()
    await page.getByLabel("Group Name").fill("Deterministic Group")
    await page.getByLabel("External ID (Optional)").fill("GRP-DET")
    await page.getByText("Grant Access to All Collections").click()
    await page.getByRole("dialog").getByText("Alice Wright", { exact: true }).click()
    await page.getByRole("button", { name: "Create Group" }).click()
    await expect(page.getByRole("status")).toContainText("Group created successfully.")
    await expect(page.getByRole("button", { name: /Deterministic Group/ })).toBeVisible()
    await page.getByRole("button", { name: /Deterministic Group/ }).click()
    await page.getByRole("button", { name: "Edit Group" }).click()
    await page.getByLabel("Group Name").fill("Deterministic Group Updated")
    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByRole("status")).toContainText("Group updated.")
    await page.getByRole("button", { name: "Delete Group" }).click()
    await expect(page.getByRole("status")).toContainText("Group deleted.")
  })

  test("toggles and configures policies", async ({ page }) => {
    await page.goto("/organizations?tab=policies")
    await page.getByRole("button", { name: "Disable" }).first().click()
    await expect(page.getByRole("status")).toContainText("Policy disabled successfully.")
    await page.getByRole("button", { name: "Configure" }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await page.getByRole("button", { name: "Save Policy" }).click()
    await expect(page.getByRole("status")).toContainText("Security policy updated.")
  })

  test("filters and paginates events", async ({ page }) => {
    await page.goto("/organizations?tab=events")
    await expect(page.getByRole("heading", { name: "Event & Audit Logs" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Load Older Events" })).toBeVisible()
    await page.getByPlaceholder("Search events, actors, IP addresses...").fill("Vault Item Created")
    await expect(page.locator("tbody tr")).toHaveCount(1)
    await page.getByPlaceholder("Search events, actors, IP addresses...").fill("")
    await page.getByRole("button", { name: "Load Older Events" }).click()
    await expect(page.locator("tbody tr")).toHaveCount(3)
    await page.getByRole("combobox").nth(1).selectOption("usr-bob-002")
    await expect(page.locator("tbody tr")).toHaveCount(1)
  })

  test("verifies, creates, and removes domains", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept())
    await page.goto("/organizations?tab=domains")
    await page.getByRole("button", { name: "Verify DNS" }).first().click()
    await expect(page.getByRole("status")).toContainText("Domain verified successfully!")
    await expect(page.getByText("Verified").first()).toBeVisible()
    await page.getByRole("button", { name: "Claim Domain" }).click()
    await page.getByLabel("Domain Name").fill("deterministic.example.com")
    await page.getByRole("button", { name: "Claim Domain" }).last().click()
    await expect(page.getByRole("status")).toContainText("Domain claimed successfully.")
    await page.getByRole("button", { name: "Remove" }).last().click()
    await expect(page.getByRole("status")).toContainText("Domain removed.")
    await expect(page.getByText("deterministic.example.com")).toHaveCount(0)
  })

  test("saves SSO configuration", async ({ page }) => {
    await page.goto("/organizations?tab=sso")
    await page.getByLabel("SSO Identifier").fill("deterministic-org")
    await page.getByLabel("Authority / Issuer URL").fill("https://idp.example.com")
    await page.getByLabel("Client ID").fill("client-id")
    await page.getByLabel("Client Secret").fill("client-secret")
    await page.getByRole("button", { name: "Save SSO Configuration" }).click()
    await expect(page.getByRole("status")).toContainText("SSO configuration saved.")
    await expect(page.getByText("SSO configuration saved successfully.")).toBeVisible()
  })

  test("supports deep links, responsive layout, and keyboard dismissal", async ({ page }) => {
    const domainsResponse = await page.goto("/organizations?tab=domains&orgId=org-acme-corp-001")
    expect(domainsResponse?.status(), "the organization frontend route should serve the SPA").not.toBe(404)
    await expect(page.getByRole("heading", { name: "Domain Verification" })).toBeVisible()
    await page.goto("/organizations?tab=collections&dialog=create-collection&orgId=org-acme-corp-001")
    await expect(page.getByRole("heading", { name: "Create Collection" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("heading", { name: "Create Collection" })).toBeHidden()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/organizations?tab=members")
    await page.getByRole("button", { name: /Alice Wright/ }).click()
    await expect(page.getByRole("heading", { name: "Alice Wright" })).toBeVisible()
    const viewport = await page
      .locator("body")
      .evaluate((body) => ({ clientWidth: body.clientWidth, scrollWidth: body.scrollWidth }))
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth)
  })
})
