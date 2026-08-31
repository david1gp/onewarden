import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { organizationCollectionListStateCreate } from "../../../src/web/organizations/ui/organizationCollectionListStateCreate.js"
import { organizationMemberInviteDialogStateCreate } from "../../../src/web/organizations/ui/organizationMemberInviteDialogStateCreate.js"
import { organizationMemberListStateCreate } from "../../../src/web/organizations/ui/organizationMemberListStateCreate.js"
import { organizationNavStateCreate } from "../../../src/web/organizations/ui/organizationNavStateCreate.js"
import { organizationWorkspaceStateCreate } from "../../../src/web/organizations/ui/organizationWorkspaceStateCreate.js"

window.location.href = "http://localhost/"

describe("organizationWorkspaceState and child state creators", () => {
  test("organizationWorkspaceState accepts valid URL state and ignores malformed values", () => {
    const initialUrl = window.location.href
    window.history.replaceState(
      null,
      "",
      "http://localhost/?tab=collections&orgId=org-startup-lab-002&memberId=mem-bob-002&collectionId=col-finance-002&groupId=grp-finance-002&dialog=create-group",
    )

    createRoot((dispose) => {
      const state = organizationWorkspaceStateCreate()

      expect(state.activeOrg()?.id).toBe("org-startup-lab-002")
      expect(state.activeTab()).toBe("collections")
      expect(state.selectedMemberId()).toBe("mem-bob-002")
      expect(state.selectedCollectionId()).toBe("col-finance-002")
      expect(state.selectedGroupId()).toBe("grp-finance-002")
      expect(state.isCreateGroupOpen()).toBe(true)
      dispose()
    })

    window.history.replaceState(null, "", "http://localhost/?tab=unknown&orgId=%20&memberId=%20&dialog=unknown")
    createRoot((dispose) => {
      const state = organizationWorkspaceStateCreate()

      expect(state.activeOrg()?.id).toBe("org-acme-corp-001")
      expect(state.activeTab()).toBe("members")
      expect(state.selectedMemberId()).toBe("mem-alice-001")
      expect(state.isCreateGroupOpen()).toBe(false)
      dispose()
    })
    window.history.replaceState(null, "", initialUrl)
  })

  test("organizationWorkspaceState initializes with active organization, members, and collections", () => {
    createRoot((dispose) => {
      const state = organizationWorkspaceStateCreate()

      expect(state.organizations().length).toBeGreaterThan(0)
      expect(state.activeOrg()).not.toBeNull()
      expect(state.activeTab()).toBe("members")
      expect(state.members().length).toBeGreaterThan(0)
      expect(state.collections().length).toBeGreaterThan(0)

      state.handleSelectTab("collections")
      expect(state.activeTab()).toBe("collections")

      state.handleSelectTab("settings")
      expect(state.activeTab()).toBe("settings")

      dispose()
    })
  })

  test("organizationNavState handles tab and org changes", () => {
    createRoot((dispose) => {
      let selectedTab = "members"
      let selectedOrg = "org-1"
      let openCreateOrgCalled = false

      const navState = organizationNavStateCreate({
        activeOrg: () => ({ billingEmail: "test@example.com", id: "org-1", name: "Org 1" }),
        activeTab: () => selectedTab as any,
        collectionCount: () => 5,
        domainCount: () => 2,
        groupCount: () => 3,
        memberCount: () => 12,
        onOpenCreateOrg: () => {
          openCreateOrgCalled = true
        },
        onSelectOrg: (id) => {
          selectedOrg = id
        },
        onSelectTab: (tab) => {
          selectedTab = tab
        },
        organizations: () => [{ billingEmail: "test@example.com", id: "org-1", name: "Org 1" }],
        policyCount: () => 8,
      })

      expect(navState.isTabActive("members")).toBe(true)
      expect(navState.isTabActive("collections")).toBe(false)
      expect(navState.memberCount()).toBe(12)
      expect(navState.collectionCount()).toBe(5)

      navState.handleSelectTab("collections")
      expect(selectedTab).toBe("collections")

      navState.handleSelectOrgChange({ target: { value: "org-2" } } as any)
      expect(selectedOrg).toBe("org-2")

      navState.handleNewOrgClick()
      expect(openCreateOrgCalled).toBe(true)

      dispose()
    })
  })

  test("organizationMemberListState filters members by search query", () => {
    createRoot((dispose) => {
      const members = [
        { accessAll: true, email: "alice@example.com", id: "1", name: "Alice", status: 2, type: 0 },
        { accessAll: false, email: "bob@example.com", id: "2", name: "Bob", status: 2, type: 2 },
      ]
      let selectedId = "1"

      const listState = organizationMemberListStateCreate({
        members: () => members,
        onInviteClick: () => {},
        onSelectMember: (id) => {
          selectedId = id
        },
        selectedMemberId: () => selectedId,
      })

      expect(listState.filteredMembers()).toHaveLength(2)

      listState.handleSearchChange("bob")
      expect(listState.filteredMembers()).toHaveLength(1)
      expect(listState.filteredMembers()[0]?.name).toBe("Bob")

      listState.handleSearchChange("alice")
      expect(listState.filteredMembers()).toHaveLength(1)
      expect(listState.filteredMembers()[0]?.name).toBe("Alice")

      listState.handleSearchChange("")
      expect(listState.filteredMembers()).toHaveLength(2)

      dispose()
    })
  })

  test("organizationCollectionListState filters collections by search query", () => {
    createRoot((dispose) => {
      const collections = [
        { id: "c1", name: "Engineering", organizationId: "org-1" },
        { id: "c2", name: "Marketing", organizationId: "org-1" },
      ]
      let selectedId = "c1"

      const listState = organizationCollectionListStateCreate({
        collections: () => collections,
        onCreateClick: () => {},
        onSelectCollection: (id) => {
          selectedId = id
        },
        selectedCollectionId: () => selectedId,
      })

      expect(listState.filteredCollections()).toHaveLength(2)

      listState.handleSearchChange("eng")
      expect(listState.filteredCollections()).toHaveLength(1)
      expect(listState.filteredCollections()[0]?.name).toBe("Engineering")

      dispose()
    })
  })

  test("organizationMemberInviteDialogState manages emails, roles, and collection access", async () => {
    await new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const collections = [
          { id: "col-1", name: "Dev", organizationId: "org-1" },
          { id: "col-2", name: "Ops", organizationId: "org-1" },
        ]
        let invitedInput: any = null

        const dialogState = organizationMemberInviteDialogStateCreate({
          collections: () => collections,
          isOpen: () => true,
          onClose: () => {},
          onInvite: async (input) => {
            invitedInput = input
            return true
          },
        })

        dialogState.handleEmailsInput({ target: { value: "user1@example.com, user2@example.com" } } as any)
        expect(dialogState.emailsInput()).toBe("user1@example.com, user2@example.com")

        dialogState.handleAccessAllToggle()
        expect(dialogState.accessAll()).toBe(false)

        dialogState.toggleCollectionIncluded("col-1")
        expect(dialogState.isCollectionIncluded("col-1")).toBe(true)

        dialogState.updateCollectionPerm("col-1", "readOnly", true)
        expect(dialogState.collectionAccess()["col-1"]?.readOnly).toBe(true)

        void dialogState.handleSubmit({ preventDefault: () => {} } as any).then(() => {
          expect(invitedInput).not.toBeNull()
          expect(invitedInput.emails).toEqual(["user1@example.com", "user2@example.com"])
          expect(invitedInput.accessAll).toBe(false)
          expect(invitedInput.collections).toEqual([
            { hidePasswords: false, id: "col-1", manage: false, readOnly: true },
          ])
          dispose()
          resolve()
        })
      })
    })
  })
})
