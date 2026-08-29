import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { organizationWorkspaceStateCreate } from "../../../src/web/organizations/ui/organizationWorkspaceStateCreate.js"
import { organizationGroupListStateCreate } from "../../../src/web/organizations/ui/organizationGroupListStateCreate.js"
import { organizationGroupDetailStateCreate } from "../../../src/web/organizations/ui/organizationGroupDetailStateCreate.js"
import { organizationGroupCreateDialogStateCreate } from "../../../src/web/organizations/ui/organizationGroupCreateDialogStateCreate.js"
import { organizationPolicyListStateCreate } from "../../../src/web/organizations/ui/organizationPolicyListStateCreate.js"
import { organizationPolicyEditDialogStateCreate } from "../../../src/web/organizations/ui/organizationPolicyEditDialogStateCreate.js"
import { organizationEventViewerStateCreate } from "../../../src/web/organizations/ui/organizationEventViewerStateCreate.js"
import { organizationDomainListStateCreate } from "../../../src/web/organizations/ui/organizationDomainListStateCreate.js"
import { organizationDomainCreateDialogStateCreate } from "../../../src/web/organizations/ui/organizationDomainCreateDialogStateCreate.js"
import { organizationSsoCardStateCreate } from "../../../src/web/organizations/ui/organizationSsoCardStateCreate.js"

describe("Task 36 Organization Features - Sibling State Creators", () => {
  test("organizationWorkspaceState handles group, policy, domain, and sso tabs", () => {
    createRoot((dispose) => {
      const state = organizationWorkspaceStateCreate()

      expect(state.groups().length).toBeGreaterThan(0)
      expect(state.policies().length).toBeGreaterThan(0)
      expect(state.events().length).toBeGreaterThan(0)
      expect(state.domains().length).toBeGreaterThan(0)
      expect(state.sso()).not.toBeNull()

      state.handleSelectTab("groups")
      expect(state.activeTab()).toBe("groups")

      state.handleSelectTab("policies")
      expect(state.activeTab()).toBe("policies")

      state.handleSelectTab("events")
      expect(state.activeTab()).toBe("events")

      state.handleSelectTab("domains")
      expect(state.activeTab()).toBe("domains")

      state.handleSelectTab("sso")
      expect(state.activeTab()).toBe("sso")

      dispose()
    })
  })

  test("organizationGroupListState and Detail handle searching and selection", () => {
    createRoot((dispose) => {
      const groups = [
        {
          accessAll: true,
          collections: [],
          externalId: "GRP-01",
          id: "g1",
          name: "Engineering",
          organizationId: "org-1",
          users: ["u1"],
        },
        {
          accessAll: false,
          collections: [],
          externalId: "GRP-02",
          id: "g2",
          name: "Marketing",
          organizationId: "org-1",
          users: [],
        },
      ]
      let selectedId = "g1"

      const listState = organizationGroupListStateCreate({
        groups: () => groups,
        onCreateClick: () => {},
        onSelectGroup: (id) => {
          selectedId = id
        },
        selectedGroupId: () => selectedId,
      })

      expect(listState.filteredGroups()).toHaveLength(2)
      listState.handleSearchChange("eng")
      expect(listState.filteredGroups()).toHaveLength(1)
      expect(listState.filteredGroups()[0]?.name).toBe("Engineering")

      const members = [{ accessAll: false, email: "u1@example.com", id: "u1", name: "User One", status: 2, type: 2 }]
      const collections = [{ id: "c1", name: "Col 1", organizationId: "org-1" }]

      let editCalled = false

      const detailState = organizationGroupDetailStateCreate({
        collections: () => collections,
        group: () => groups[0] ?? null,
        members: () => members,
        onDelete: () => {},
        onEdit: () => {
          editCalled = true
        },
      })

      expect(detailState.group()?.name).toBe("Engineering")
      expect(detailState.assignedMembers()).toHaveLength(1)
      expect(detailState.assignedMembers()[0]?.name).toBe("User One")

      detailState.handleEditClick()
      expect(editCalled).toBe(true)

      dispose()
    })
  })

  test("organizationGroupCreateDialogState validates and builds group payload", async () => {
    await new Promise<void>((resolve) => {
      createRoot((dispose) => {
        let createdInput: any = null

        const dialogState = organizationGroupCreateDialogStateCreate({
          collections: () => [{ id: "col-1", name: "Backend", organizationId: "org-1" }],
          isOpen: () => true,
          members: () => [{ accessAll: false, email: "dev@test.com", id: "m1", name: "Dev", status: 2, type: 2 }],
          onClose: () => {},
          onCreate: async (input) => {
            createdInput = input
            return true
          },
        })

        dialogState.handleNameInput({ target: { value: "Backend Team" } } as any)
        dialogState.handleExternalIdInput({ target: { value: "EXT-GRP-1" } } as any)
        dialogState.toggleMemberSelected("m1")
        dialogState.toggleCollectionIncluded("col-1")
        dialogState.updateCollectionPerm("col-1", "manage", true)

        void dialogState.handleSubmit({ preventDefault: () => {} } as any).then(() => {
          expect(createdInput).not.toBeNull()
          expect(createdInput.name).toBe("Backend Team")
          expect(createdInput.externalId).toBe("EXT-GRP-1")
          expect(createdInput.users).toEqual(["m1"])
          expect(createdInput.collections).toEqual([
            { hidePasswords: false, id: "col-1", manage: true, readOnly: false },
          ])
          dispose()
          resolve()
        })
      })
    })
  })

  test("organizationPolicyListState and EditDialog handle toggling and configuring policies", async () => {
    await new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const policies = [
          { enabled: true, id: "p1", organizationId: "org-1", type: 0 },
          { data: { minLength: 12 }, enabled: false, id: "p2", organizationId: "org-1", type: 1 },
        ]

        let toggledPolicy: any = null
        let savedPolicyInput: any = null

        const listState = organizationPolicyListStateCreate({
          onEditPolicy: () => {},
          onTogglePolicy: async (pol, en) => {
            toggledPolicy = { pol, en }
            return true
          },
          policies: () => policies,
        })

        expect(listState.filteredPolicies()).toHaveLength(2)
        void listState.handleToggle(policies[0]!)
        expect(toggledPolicy?.en).toBe(false)

        const dialogState = organizationPolicyEditDialogStateCreate({
          isOpen: () => true,
          onClose: () => {},
          onSave: async (_type, input) => {
            savedPolicyInput = input
            return true
          },
          policy: () => policies[1] ?? null,
        })

        expect(dialogState.policyName()).toBe("Master Password Requirements")
        dialogState.handleEnabledToggle(true)
        dialogState.handleMinLengthChange({ target: { value: "16" } } as any)

        void dialogState.handleSubmit({ preventDefault: () => {} } as any).then(() => {
          expect(savedPolicyInput).not.toBeNull()
          expect(savedPolicyInput.enabled).toBe(true)
          expect(savedPolicyInput.data.minLength).toBe(16)
          dispose()
          resolve()
        })
      })
    })
  })

  test("organizationEventViewerState resolves event names, actors, and filters", () => {
    createRoot((dispose) => {
      const events = [
        {
          actingUserId: "usr-1",
          cipherId: null,
          collectionId: null,
          date: "2026-08-28T12:00:00.000Z",
          deviceType: 14,
          groupId: null,
          ipAddress: "127.0.0.1",
          organizationId: "org-1",
          organizationUserId: null,
          policyId: null,
          providerId: null,
          providerOrganizationId: null,
          providerUserId: null,
          type: 1000,
          userId: "usr-1",
        },
        {
          actingUserId: "usr-2",
          cipherId: "c1",
          collectionId: null,
          date: "2026-08-28T13:00:00.000Z",
          deviceType: 1,
          groupId: null,
          ipAddress: "192.168.1.1",
          organizationId: "org-1",
          organizationUserId: null,
          policyId: null,
          providerId: null,
          providerOrganizationId: null,
          providerUserId: null,
          type: 1100,
          userId: "usr-2",
        },
      ]
      const members = [
        { accessAll: true, email: "alice@acme.com", id: "m1", name: "Alice", status: 2, type: 0, userId: "usr-1" },
      ]

      const state = organizationEventViewerStateCreate({
        events: () => events,
        members: () => members,
      })

      expect(state.filteredEvents()).toHaveLength(2)
      expect(state.getEventName(1000)).toBe("User Logged In")
      expect(state.getEventName(1100)).toBe("Vault Item Created")
      expect(state.resolveMemberName("usr-1")).toBe("Alice")
      expect(state.resolveDeviceName(14)).toBe("Web Vault")

      state.handleSearchChange("127.0.0.1")
      expect(state.filteredEvents()).toHaveLength(1)

      dispose()
    })
  })

  test("organizationDomainListState and DomainCreateDialog manage domain verification", async () => {
    await new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const domains = [
          {
            creationDate: "2026-08-01",
            domainName: "acme.com",
            id: "d1",
            organizationId: "org-1",
            txt: "verify-1",
            verifiedDate: "2026-08-01",
          },
          {
            creationDate: "2026-08-02",
            domainName: "test.io",
            id: "d2",
            organizationId: "org-1",
            txt: "verify-2",
            verifiedDate: null,
          },
        ]

        let verifiedDomainId = ""
        let createdDomainName = ""

        const listState = organizationDomainListStateCreate({
          domains: () => domains,
          onCreateClick: () => {},
          onDeleteDomain: async () => true,
          onVerifyDomain: async (id) => {
            verifiedDomainId = id
            return true
          },
        })

        expect(listState.domains()).toHaveLength(2)
        void listState.handleVerify(domains[1]!)
        expect(verifiedDomainId).toBe("d2")

        const createDialogState = organizationDomainCreateDialogStateCreate({
          isOpen: () => true,
          onClose: () => {},
          onCreate: async (input) => {
            createdDomainName = input.domainName
            return true
          },
        })

        createDialogState.handleDomainNameInput({ target: { value: "example.org" } } as any)
        void createDialogState.handleSubmit({ preventDefault: () => {} } as any).then(() => {
          expect(createdDomainName).toBe("example.org")
          dispose()
          resolve()
        })
      })
    })
  })

  test("organizationSsoCardState manages OIDC and SAML configurations", async () => {
    await new Promise<void>((resolve) => {
      createRoot((dispose) => {
        let savedSsoInput: any = null

        const state = organizationSsoCardStateCreate({
          onSaveSso: async (input) => {
            savedSsoInput = input
            return true
          },
          sso: () => ({
            Data: { Authority: "https://auth.example.com", ClientId: "client-123", SsoType: 1 },
            Enabled: true,
            Identifier: "acme-sso",
            Urls: { CallbackPath: "https://vault.example.com/oidc-signin" },
          }),
        })

        expect(state.enabled()).toBe(true)
        expect(state.identifier()).toBe("acme-sso")
        expect(state.authority()).toBe("https://auth.example.com")
        expect(state.clientId()).toBe("client-123")
        expect(state.urls()?.CallbackPath).toBe("https://vault.example.com/oidc-signin")

        state.handleIdentifierInput({ target: { value: "acme-corp-updated" } } as any)
        state.handleClientSecretInput({ target: { value: "secret-xyz" } } as any)

        void state.handleSubmit({ preventDefault: () => {} } as any).then(() => {
          expect(savedSsoInput).not.toBeNull()
          expect(savedSsoInput.enabled).toBe(true)
          expect(savedSsoInput.identifier).toBe("acme-corp-updated")
          expect(savedSsoInput.data.ClientId).toBe("client-123")
          expect(savedSsoInput.data.ClientSecret).toBe("secret-xyz")
          dispose()
          resolve()
        })
      })
    })
  })
})
