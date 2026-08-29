import type { AdminOrganization } from "../admin/adminOrganizationSchema.js"

export const adminOrganizationsDemoData: readonly AdminOrganization[] = [
  {
    id: "organization-acme-core",
    name: "Acme Core Infrastructure",
    status: "active",
    plan: "enterprise",
    ownerName: "Alex Rivera",
    memberCount: 24,
    twoFactorRequired: true,
    ssoEnabled: false,
    createdAt: "2024-11-10T11:00:00Z",
  },
  {
    id: "organization-acme-design",
    name: "Acme Design Studio",
    status: "active",
    plan: "premium",
    ownerName: "Morgan Lee",
    memberCount: 8,
    twoFactorRequired: false,
    ssoEnabled: true,
    createdAt: "2025-03-01T10:15:00Z",
  },
  {
    id: "organization-legacy-labs",
    name: "Legacy Labs",
    status: "disabled",
    plan: "free",
    ownerName: "Jamie Patel",
    memberCount: 3,
    twoFactorRequired: false,
    ssoEnabled: false,
    createdAt: "2023-06-21T08:30:00Z",
  },
]
