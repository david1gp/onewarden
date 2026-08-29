import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { organizationCreateInputSchema } from "../../../src/web/organizations/schemas/organizationCreateInputSchema.js"
import { organizationUpdateInputSchema } from "../../../src/web/organizations/schemas/organizationUpdateInputSchema.js"
import { organizationMemberInviteInputSchema } from "../../../src/web/organizations/schemas/organizationMemberInviteInputSchema.js"
import { organizationCollectionInputSchema } from "../../../src/web/organizations/schemas/organizationCollectionInputSchema.js"
import { organizationGroupInputSchema } from "../../../src/web/organizations/schemas/organizationGroupInputSchema.js"
import { organizationPolicyInputSchema } from "../../../src/web/organizations/schemas/organizationPolicyInputSchema.js"
import { organizationDomainInputSchema } from "../../../src/web/organizations/schemas/organizationDomainInputSchema.js"
import { organizationSsoInputSchema } from "../../../src/web/organizations/schemas/organizationSsoInputSchema.js"
import { organizationMemberRoleLabelResolve } from "../../../src/web/organizations/api/organizationMemberRoleLabelResolve.js"
import { organizationMemberStatusLabelResolve } from "../../../src/web/organizations/api/organizationMemberStatusLabelResolve.js"
import { organizationPolicyNameResolve } from "../../../src/web/organizations/api/organizationPolicyNameResolve.js"
import { organizationEventNameResolve } from "../../../src/web/organizations/api/organizationEventNameResolve.js"

describe("organizationSchemas and helper resolvers", () => {
  test("organizationCreateInputSchema validates correct inputs and catches invalid emails", () => {
    const valid = {
      billingEmail: "admin@example.com",
      collectionName: "Default",
      name: "Acme",
    }
    const resultValid = v.safeParse(organizationCreateInputSchema, valid)
    expect(resultValid.success).toBe(true)

    const invalidEmail = {
      billingEmail: "not-an-email",
      name: "Acme",
    }
    const resultInvalid = v.safeParse(organizationCreateInputSchema, invalidEmail)
    expect(resultInvalid.success).toBe(false)

    const emptyName = {
      billingEmail: "admin@example.com",
      name: "",
    }
    const resultEmptyName = v.safeParse(organizationCreateInputSchema, emptyName)
    expect(resultEmptyName.success).toBe(false)
  })

  test("organizationUpdateInputSchema validates correctly", () => {
    const valid = { billingEmail: "billing@acme.com", name: "Acme Corp" }
    expect(v.safeParse(organizationUpdateInputSchema, valid).success).toBe(true)

    const invalid = { billingEmail: "wrong", name: "" }
    expect(v.safeParse(organizationUpdateInputSchema, invalid).success).toBe(false)
  })

  test("organizationMemberInviteInputSchema requires valid email array", () => {
    const valid = {
      accessAll: true,
      emails: ["alice@example.com", "bob@example.com"],
      type: 2,
    }
    expect(v.safeParse(organizationMemberInviteInputSchema, valid).success).toBe(true)

    const emptyEmails = {
      accessAll: true,
      emails: [],
      type: 2,
    }
    expect(v.safeParse(organizationMemberInviteInputSchema, emptyEmails).success).toBe(false)
  })

  test("organizationCollectionInputSchema validates collection payload", () => {
    const valid = { externalId: "COL-01", name: "Engineering", users: [] }
    expect(v.safeParse(organizationCollectionInputSchema, valid).success).toBe(true)

    const empty = { name: "" }
    expect(v.safeParse(organizationCollectionInputSchema, empty).success).toBe(false)
  })

  test("organizationGroupInputSchema validates group payload", () => {
    const valid = { accessAll: false, collections: [], externalId: "GRP-01", name: "Devs", users: ["u1"] }
    expect(v.safeParse(organizationGroupInputSchema, valid).success).toBe(true)

    const emptyName = { accessAll: false, name: "" }
    expect(v.safeParse(organizationGroupInputSchema, emptyName).success).toBe(false)
  })

  test("organizationPolicyInputSchema validates policy data", () => {
    const valid = { data: { minLength: 14 }, enabled: true }
    expect(v.safeParse(organizationPolicyInputSchema, valid).success).toBe(true)
  })

  test("organizationDomainInputSchema validates domain format", () => {
    const valid = { domainName: "company.com" }
    expect(v.safeParse(organizationDomainInputSchema, valid).success).toBe(true)

    const invalid = { domainName: "not a domain" }
    expect(v.safeParse(organizationDomainInputSchema, invalid).success).toBe(false)
  })

  test("organizationSsoInputSchema validates sso configuration", () => {
    const valid = { data: { Authority: "https://auth.acme.com" }, enabled: true, identifier: "acme" }
    expect(v.safeParse(organizationSsoInputSchema, valid).success).toBe(true)
  })

  test("organizationMemberRoleLabelResolve and status resolves labels properly", () => {
    expect(organizationMemberRoleLabelResolve(0)).toBe("Owner")
    expect(organizationMemberRoleLabelResolve(1)).toBe("Admin")
    expect(organizationMemberRoleLabelResolve(2)).toBe("User")
    expect(organizationMemberRoleLabelResolve(3)).toBe("Manager")
    expect(organizationMemberRoleLabelResolve(4)).toBe("Custom")

    expect(organizationMemberStatusLabelResolve(2)).toEqual({ label: "Confirmed", variant: "filledGreen" })
    expect(organizationMemberStatusLabelResolve(1)).toEqual({ label: "Accepted", variant: "filledBlue" })
    expect(organizationMemberStatusLabelResolve(0)).toEqual({ label: "Invited", variant: "filledYellow" })
    expect(organizationMemberStatusLabelResolve(-1)).toEqual({ label: "Revoked", variant: "filledRed" })
  })

  test("organizationPolicyNameResolve and event resolvers handle known types", () => {
    expect(organizationPolicyNameResolve(0)).toBe("Two-Step Login")
    expect(organizationPolicyNameResolve(1)).toBe("Master Password Requirements")
    expect(organizationPolicyNameResolve(8)).toBe("Reset Password")

    expect(organizationEventNameResolve(1000)).toBe("User Logged In")
    expect(organizationEventNameResolve(1100)).toBe("Vault Item Created")
    expect(organizationEventNameResolve(1400)).toBe("Group Created")
  })
})
