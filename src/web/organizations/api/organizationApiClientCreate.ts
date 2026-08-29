import { createResult, createResultError, type Result } from "#result"
import type { Organization } from "../schemas/organizationSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"
import type { OrganizationCreateInput } from "../schemas/organizationCreateInputSchema.js"
import type { OrganizationUpdateInput } from "../schemas/organizationUpdateInputSchema.js"
import type { OrganizationMemberInviteInput } from "../schemas/organizationMemberInviteInputSchema.js"
import type { OrganizationMemberUpdateInput } from "../schemas/organizationMemberUpdateInputSchema.js"
import type { OrganizationCollectionInput } from "../schemas/organizationCollectionInputSchema.js"
import type { OrganizationGroup } from "../schemas/organizationGroupSchema.js"
import type { OrganizationGroupInput } from "../schemas/organizationGroupInputSchema.js"
import type { OrganizationPolicy } from "../schemas/organizationPolicySchema.js"
import type { OrganizationPolicyInput } from "../schemas/organizationPolicyInputSchema.js"
import type { OrganizationEvent } from "../schemas/organizationEventSchema.js"
import type { OrganizationDomain } from "../schemas/organizationDomainSchema.js"
import type { OrganizationDomainInput } from "../schemas/organizationDomainInputSchema.js"
import type { OrganizationSso } from "../schemas/organizationSsoSchema.js"
import type { OrganizationSsoInput } from "../schemas/organizationSsoInputSchema.js"

export interface OrganizationApiClientOptions {
  baseUrl?: string
  fetchFn?: typeof fetch
  token?: () => string | null
}

export function organizationApiClientCreate(options: OrganizationApiClientOptions = {}) {
  const fetchFn = options.fetchFn ?? fetch
  const baseUrl = (options.baseUrl ?? "").replace(/\/+$/, "")
  const getToken = options.token ?? (() => null)

  const buildHeaders = (contentType = true): HeadersInit => {
    const headers: Record<string, string> = {}
    if (contentType) headers["content-type"] = "application/json"
    const token = getToken()
    if (token) headers.authorization = `Bearer ${token}`
    return headers
  }

  // --- Organization CRUD ---

  const organizationList = async (): Promise<Result<Organization[]>> => {
    const op = "organizationList"
    try {
      const response = await fetchFn(`${baseUrl}/api/sync`, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to load sync profile (${response.status})`)
      }
      const data = (await response.json()) as { profile?: { organizations?: Organization[] } }
      const orgs: Organization[] = (data.profile?.organizations ?? []).map((org) => ({
        billingEmail: org.billingEmail ?? null,
        hasPublicAndPrivateKeys: org.hasPublicAndPrivateKeys,
        id: org.id,
        identifier: org.identifier ?? null,
        key: org.key ?? null,
        maxCollections: org.maxCollections ?? null,
        maxStorageGb: org.maxStorageGb ?? null,
        name: org.name,
        planType: org.planType ?? 6,
        seats: org.seats ?? null,
        status: org.status ?? 2,
        type: org.type ?? 0,
      }))
      return createResult(orgs)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error listing organizations")
    }
  }

  const organizationGet = async (organizationId: string): Promise<Result<Organization>> => {
    const op = "organizationGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}`, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to get organization (${response.status})`)
      }
      const data = (await response.json()) as Organization
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error getting organization")
    }
  }

  const organizationCreate = async (input: OrganizationCreateInput): Promise<Result<Organization>> => {
    const op = "organizationCreate"
    try {
      const payload = {
        billingEmail: input.billingEmail,
        collectionName: input.collectionName || "Default Collection",
        key: input.key || "0|demo-org-key",
        name: input.name,
        planType: input.planType ?? 6,
      }
      const response = await fetchFn(`${baseUrl}/api/organizations`, {
        body: JSON.stringify(payload),
        headers: buildHeaders(true),
        method: "POST",
      })
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to create organization (${response.status})`)
      }
      const data = (await response.json()) as Organization
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error creating organization")
    }
  }

  const organizationUpdate = async (
    organizationId: string,
    input: OrganizationUpdateInput,
  ): Promise<Result<Organization>> => {
    const op = "organizationUpdate"
    try {
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}`, {
        body: JSON.stringify(input),
        headers: buildHeaders(true),
        method: "PUT",
      })
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to update organization (${response.status})`)
      }
      const data = (await response.json()) as Organization
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error updating organization")
    }
  }

  // --- Member Management ---

  const organizationMemberList = async (organizationId: string): Promise<Result<OrganizationMember[]>> => {
    const op = "organizationMemberList"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users?includeCollections=true&includeGroups=true`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        return createResultError(op, `Failed to load organization members (${response.status})`)
      }
      const data = (await response.json()) as { data?: OrganizationMember[] }
      return createResult(data.data ?? [])
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading members")
    }
  }

  const organizationMemberGet = async (
    organizationId: string,
    memberId: string,
  ): Promise<Result<OrganizationMember>> => {
    const op = "organizationMemberGet"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}?includeCollections=true&includeGroups=true`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        return createResultError(op, `Failed to get organization member (${response.status})`)
      }
      const data = (await response.json()) as OrganizationMember
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error getting member")
    }
  }

  const organizationMemberInvite = async (
    organizationId: string,
    input: OrganizationMemberInviteInput,
  ): Promise<Result<void>> => {
    const op = "organizationMemberInvite"
    try {
      const payload = {
        collections: input.accessAll ? [] : (input.collections ?? []),
        emails: input.emails,
        groups: input.groups ?? [],
        permissions:
          input.type === 4 && input.accessAll
            ? { createNewCollections: true, deleteAnyCollection: true, editAnyCollection: true }
            : undefined,
        type: input.type,
      }
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/invite`,
        {
          body: JSON.stringify(payload),
          headers: buildHeaders(true),
          method: "POST",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to invite member (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error inviting member")
    }
  }

  const organizationMemberUpdate = async (
    organizationId: string,
    memberId: string,
    input: OrganizationMemberUpdateInput,
  ): Promise<Result<void>> => {
    const op = "organizationMemberUpdate"
    try {
      const payload = {
        accessAll: input.accessAll,
        collections: input.accessAll ? [] : (input.collections ?? []),
        groups: input.groups ?? [],
        permissions:
          input.type === 4 && input.accessAll
            ? { createNewCollections: true, deleteAnyCollection: true, editAnyCollection: true }
            : undefined,
        type: input.type,
      }
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}`,
        {
          body: JSON.stringify(payload),
          headers: buildHeaders(true),
          method: "PUT",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to update member (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error updating member")
    }
  }

  const organizationMemberRemove = async (organizationId: string, memberId: string): Promise<Result<void>> => {
    const op = "organizationMemberRemove"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}`,
        {
          headers: buildHeaders(false),
          method: "DELETE",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to remove member (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error removing member")
    }
  }

  const organizationMemberRevoke = async (organizationId: string, memberId: string): Promise<Result<void>> => {
    const op = "organizationMemberRevoke"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/revoke`,
        {
          headers: buildHeaders(false),
          method: "PUT",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to revoke member (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error revoking member")
    }
  }

  const organizationMemberRestore = async (organizationId: string, memberId: string): Promise<Result<void>> => {
    const op = "organizationMemberRestore"
    try {
      let response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/restore/vnext`,
        {
          headers: buildHeaders(false),
          method: "PUT",
        },
      )
      if (!response.ok) {
        response = await fetchFn(
          `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/restore`,
          {
            headers: buildHeaders(false),
            method: "PUT",
          },
        )
      }
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to restore member (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error restoring member")
    }
  }

  const organizationMemberReinvite = async (organizationId: string, memberId: string): Promise<Result<void>> => {
    const op = "organizationMemberReinvite"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/reinvite`,
        {
          headers: buildHeaders(false),
          method: "POST",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to reinvite member (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error reinviting member")
    }
  }

  // --- Collection Management ---

  const organizationCollectionList = async (organizationId: string): Promise<Result<OrganizationCollection[]>> => {
    const op = "organizationCollectionList"
    try {
      let response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/collections/details`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/collections`, {
          headers: buildHeaders(false),
          method: "GET",
        })
      }
      if (!response.ok) {
        return createResultError(op, `Failed to load collections (${response.status})`)
      }
      const data = (await response.json()) as { data?: OrganizationCollection[] }
      return createResult(data.data ?? [])
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading collections")
    }
  }

  const organizationCollectionCreate = async (
    organizationId: string,
    input: OrganizationCollectionInput,
  ): Promise<Result<OrganizationCollection>> => {
    const op = "organizationCollectionCreate"
    try {
      const payload = {
        externalId: input.externalId ?? null,
        groups: input.groups ?? [],
        name: input.name,
        users: input.users ?? [],
      }
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/collections`, {
        body: JSON.stringify(payload),
        headers: buildHeaders(true),
        method: "POST",
      })
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to create collection (${response.status})`)
      }
      const data = (await response.json()) as OrganizationCollection
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error creating collection")
    }
  }

  const organizationCollectionUpdate = async (
    organizationId: string,
    collectionId: string,
    input: OrganizationCollectionInput,
  ): Promise<Result<OrganizationCollection>> => {
    const op = "organizationCollectionUpdate"
    try {
      const payload = {
        externalId: input.externalId ?? null,
        groups: input.groups ?? [],
        name: input.name,
        users: input.users ?? [],
      }
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/collections/${encodeURIComponent(collectionId)}`,
        {
          body: JSON.stringify(payload),
          headers: buildHeaders(true),
          method: "PUT",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to update collection (${response.status})`)
      }
      const data = (await response.json()) as OrganizationCollection
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error updating collection")
    }
  }

  const organizationCollectionDelete = async (organizationId: string, collectionId: string): Promise<Result<void>> => {
    const op = "organizationCollectionDelete"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/collections/${encodeURIComponent(collectionId)}`,
        {
          headers: buildHeaders(false),
          method: "DELETE",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to delete collection (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error deleting collection")
    }
  }

  // --- Group Management ---

  const organizationGroupList = async (organizationId: string): Promise<Result<OrganizationGroup[]>> => {
    const op = "organizationGroupList"
    try {
      let response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/details`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups`, {
          headers: buildHeaders(false),
          method: "GET",
        })
      }
      if (!response.ok) {
        return createResultError(op, `Failed to load groups (${response.status})`)
      }
      const data = (await response.json()) as { data?: OrganizationGroup[] }
      return createResult(data.data ?? [])
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading groups")
    }
  }

  const organizationGroupGet = async (organizationId: string, groupId: string): Promise<Result<OrganizationGroup>> => {
    const op = "organizationGroupGet"
    try {
      let response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}/details`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        response = await fetchFn(
          `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}`,
          {
            headers: buildHeaders(false),
            method: "GET",
          },
        )
      }
      if (!response.ok) {
        return createResultError(op, `Failed to get group (${response.status})`)
      }
      const data = (await response.json()) as OrganizationGroup
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error getting group")
    }
  }

  const organizationGroupCreate = async (
    organizationId: string,
    input: OrganizationGroupInput,
  ): Promise<Result<OrganizationGroup>> => {
    const op = "organizationGroupCreate"
    try {
      const payload = {
        accessAll: input.accessAll ?? false,
        collections: input.collections ?? [],
        externalId: input.externalId ?? null,
        name: input.name,
        users: input.users ?? [],
      }
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups`, {
        body: JSON.stringify(payload),
        headers: buildHeaders(true),
        method: "POST",
      })
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to create group (${response.status})`)
      }
      const data = (await response.json()) as OrganizationGroup
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error creating group")
    }
  }

  const organizationGroupUpdate = async (
    organizationId: string,
    groupId: string,
    input: OrganizationGroupInput,
  ): Promise<Result<OrganizationGroup>> => {
    const op = "organizationGroupUpdate"
    try {
      const payload = {
        accessAll: input.accessAll ?? false,
        collections: input.collections ?? [],
        externalId: input.externalId ?? null,
        name: input.name,
        users: input.users ?? [],
      }
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}`,
        {
          body: JSON.stringify(payload),
          headers: buildHeaders(true),
          method: "PUT",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to update group (${response.status})`)
      }
      const data = (await response.json()) as OrganizationGroup
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error updating group")
    }
  }

  const organizationGroupDelete = async (organizationId: string, groupId: string): Promise<Result<void>> => {
    const op = "organizationGroupDelete"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}`,
        {
          headers: buildHeaders(false),
          method: "DELETE",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to delete group (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error deleting group")
    }
  }

  const organizationGroupMembersGet = async (organizationId: string, groupId: string): Promise<Result<string[]>> => {
    const op = "organizationGroupMembersGet"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}/users`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        return createResultError(op, `Failed to load group members (${response.status})`)
      }
      const data = (await response.json()) as string[]
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading group members")
    }
  }

  const organizationGroupMembersReplace = async (
    organizationId: string,
    groupId: string,
    memberIds: string[],
  ): Promise<Result<void>> => {
    const op = "organizationGroupMembersReplace"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}/users`,
        {
          body: JSON.stringify(memberIds),
          headers: buildHeaders(true),
          method: "PUT",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to replace group members (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error replacing group members")
    }
  }

  const organizationGroupMemberDelete = async (
    organizationId: string,
    groupId: string,
    memberId: string,
  ): Promise<Result<void>> => {
    const op = "organizationGroupMemberDelete"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/groups/${encodeURIComponent(groupId)}/delete-user/${encodeURIComponent(memberId)}`,
        {
          headers: buildHeaders(false),
          method: "POST",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to remove member from group (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error removing member from group")
    }
  }

  // --- Policy Management ---

  const organizationPolicyList = async (organizationId: string): Promise<Result<OrganizationPolicy[]>> => {
    const op = "organizationPolicyList"
    try {
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/policies`, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to load policies (${response.status})`)
      }
      const data = (await response.json()) as { data?: OrganizationPolicy[] }
      return createResult(data.data ?? [])
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading policies")
    }
  }

  const organizationPolicyGet = async (organizationId: string, type: number): Promise<Result<OrganizationPolicy>> => {
    const op = "organizationPolicyGet"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/policies/${type}`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        return createResultError(op, `Failed to get policy (${response.status})`)
      }
      const data = (await response.json()) as OrganizationPolicy
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error getting policy")
    }
  }

  const organizationPolicyUpdate = async (
    organizationId: string,
    type: number,
    input: OrganizationPolicyInput,
  ): Promise<Result<OrganizationPolicy>> => {
    const op = "organizationPolicyUpdate"
    try {
      const payload = {
        policy: {
          data: input.data,
          enabled: input.enabled,
        },
      }
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/policies/${type}`,
        {
          body: JSON.stringify(payload),
          headers: buildHeaders(true),
          method: "PUT",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to update policy (${response.status})`)
      }
      const data = (await response.json()) as OrganizationPolicy
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error updating policy")
    }
  }

  // --- Event Viewer ---

  const organizationEventList = async (
    organizationId: string,
    params?: { continuationToken?: string | null; end?: string; start?: string },
  ): Promise<Result<{ continuationToken: string | null; data: OrganizationEvent[] }>> => {
    const op = "organizationEventList"
    try {
      const url = new URL(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/events`,
        "http://localhost",
      )
      if (params?.start) url.searchParams.set("start", params.start)
      if (params?.end) url.searchParams.set("end", params.end)
      if (params?.continuationToken) url.searchParams.set("continuationToken", params.continuationToken)

      const requestUrl = baseUrl
        ? `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/events${url.search}`
        : `/api/organizations/${encodeURIComponent(organizationId)}/events${url.search}`

      const response = await fetchFn(requestUrl, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to load organization events (${response.status})`)
      }
      const data = (await response.json()) as { continuationToken?: string | null; data?: OrganizationEvent[] }
      return createResult({
        continuationToken: data.continuationToken ?? null,
        data: data.data ?? [],
      })
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading events")
    }
  }

  const organizationUserEventList = async (
    organizationId: string,
    memberId: string,
    params?: { continuationToken?: string | null; end?: string; start?: string },
  ): Promise<Result<{ continuationToken: string | null; data: OrganizationEvent[] }>> => {
    const op = "organizationUserEventList"
    try {
      const url = new URL(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/events`,
        "http://localhost",
      )
      if (params?.start) url.searchParams.set("start", params.start)
      if (params?.end) url.searchParams.set("end", params.end)
      if (params?.continuationToken) url.searchParams.set("continuationToken", params.continuationToken)

      const requestUrl = baseUrl
        ? `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/events${url.search}`
        : `/api/organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(memberId)}/events${url.search}`

      const response = await fetchFn(requestUrl, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to load member events (${response.status})`)
      }
      const data = (await response.json()) as { continuationToken?: string | null; data?: OrganizationEvent[] }
      return createResult({
        continuationToken: data.continuationToken ?? null,
        data: data.data ?? [],
      })
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading member events")
    }
  }

  // --- Domain Verification ---

  const organizationDomainList = async (organizationId: string): Promise<Result<OrganizationDomain[]>> => {
    const op = "organizationDomainList"
    try {
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/domain`, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to load domains (${response.status})`)
      }
      const data = (await response.json()) as { data?: OrganizationDomain[] }
      return createResult(data.data ?? [])
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error loading domains")
    }
  }

  const organizationDomainGet = async (
    organizationId: string,
    domainId: string,
  ): Promise<Result<OrganizationDomain>> => {
    const op = "organizationDomainGet"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/domain/${encodeURIComponent(domainId)}`,
        {
          headers: buildHeaders(false),
          method: "GET",
        },
      )
      if (!response.ok) {
        return createResultError(op, `Failed to get domain (${response.status})`)
      }
      const data = (await response.json()) as OrganizationDomain
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error getting domain")
    }
  }

  const organizationDomainCreate = async (
    organizationId: string,
    input: OrganizationDomainInput,
  ): Promise<Result<OrganizationDomain>> => {
    const op = "organizationDomainCreate"
    try {
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/domain`, {
        body: JSON.stringify({ domainName: input.domainName }),
        headers: buildHeaders(true),
        method: "POST",
      })
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to create domain (${response.status})`)
      }
      const data = (await response.json()) as OrganizationDomain
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error creating domain")
    }
  }

  const organizationDomainVerify = async (
    organizationId: string,
    domainId: string,
  ): Promise<Result<OrganizationDomain>> => {
    const op = "organizationDomainVerify"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/domain/${encodeURIComponent(domainId)}/verify`,
        {
          headers: buildHeaders(false),
          method: "POST",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to verify domain (${response.status})`)
      }
      const data = (await response.json()) as OrganizationDomain
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error verifying domain")
    }
  }

  const organizationDomainDelete = async (organizationId: string, domainId: string): Promise<Result<void>> => {
    const op = "organizationDomainDelete"
    try {
      const response = await fetchFn(
        `${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/domain/${encodeURIComponent(domainId)}`,
        {
          headers: buildHeaders(false),
          method: "DELETE",
        },
      )
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to delete domain (${response.status})`)
      }
      return createResult(undefined)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error deleting domain")
    }
  }

  // --- SSO Configuration ---

  const organizationSsoGet = async (organizationId: string): Promise<Result<OrganizationSso>> => {
    const op = "organizationSsoGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/sso`, {
        headers: buildHeaders(false),
        method: "GET",
      })
      if (!response.ok) {
        return createResultError(op, `Failed to get SSO configuration (${response.status})`)
      }
      const data = (await response.json()) as OrganizationSso
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error getting SSO configuration")
    }
  }

  const organizationSsoSave = async (
    organizationId: string,
    input: OrganizationSsoInput,
  ): Promise<Result<OrganizationSso>> => {
    const op = "organizationSsoSave"
    try {
      const payload = {
        data: input.data,
        enabled: input.enabled,
        identifier: input.identifier ?? null,
      }
      const response = await fetchFn(`${baseUrl}/api/organizations/${encodeURIComponent(organizationId)}/sso`, {
        body: JSON.stringify(payload),
        headers: buildHeaders(true),
        method: "POST",
      })
      if (!response.ok) {
        const errorText = await response.text()
        return createResultError(op, errorText || `Failed to save SSO configuration (${response.status})`)
      }
      const data = (await response.json()) as OrganizationSso
      return createResult(data)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : "Network error saving SSO configuration")
    }
  }

  return {
    organizationCollectionCreate,
    organizationCollectionDelete,
    organizationCollectionList,
    organizationCollectionUpdate,
    organizationCreate,
    organizationDomainCreate,
    organizationDomainDelete,
    organizationDomainGet,
    organizationDomainList,
    organizationDomainVerify,
    organizationEventList,
    organizationGet,
    organizationGroupCreate,
    organizationGroupDelete,
    organizationGroupGet,
    organizationGroupList,
    organizationGroupMemberDelete,
    organizationGroupMembersGet,
    organizationGroupMembersReplace,
    organizationGroupUpdate,
    organizationList,
    organizationMemberGet,
    organizationMemberInvite,
    organizationMemberList,
    organizationMemberReinvite,
    organizationMemberRemove,
    organizationMemberRestore,
    organizationMemberRevoke,
    organizationMemberUpdate,
    organizationPolicyGet,
    organizationPolicyList,
    organizationPolicyUpdate,
    organizationSsoGet,
    organizationSsoSave,
    organizationUpdate,
    organizationUserEventList,
  }
}
