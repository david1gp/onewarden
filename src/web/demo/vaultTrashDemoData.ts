import type { VaultItem } from "./vaultItemSchema.js"

export const vaultTrashDemoData: readonly VaultItem[] = [
  {
    id: "item-trash-legacy-db",
    title: "Legacy Staging DB (PostgreSQL 12)",
    category: "login",
    vault: "Work",
    favorite: false,
    folder: "Infrastructure",
    username: "stage_admin_legacy",
    password: "dB8$vL2!kP9*mX4#tQ1@zR7",
    url: "postgres://db-staging-old.internal:5432",
    notes: "Decommissioned during Q2 database cluster migration to AWS RDS Aurora.",
    customFields: [
      { label: "Deletion Reason", value: "Cluster Decommissioned" },
      { label: "Deleted Date", value: "2026-08-25 (3 days ago)" },
    ],
    createdAt: "2023-04-12 11:00",
    updatedAt: "2026-08-25 09:15",
  },
  {
    id: "item-trash-vpn-cert",
    title: "Deprecated OpenVPN Client Config",
    category: "secureNote",
    vault: "Work",
    favorite: false,
    folder: "Infrastructure",
    notes: `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0r1459XjZ... [DEPRECATED PROFILE]
-----END RSA PRIVATE KEY-----

Replaced by Tailscale wireguard mesh architecture.`,
    customFields: [
      { label: "Deletion Reason", value: "Replaced with WireGuard" },
      { label: "Deleted Date", value: "2026-08-16 (12 days ago)" },
    ],
    createdAt: "2023-01-20 16:30",
    updatedAt: "2026-08-16 14:00",
  },
  {
    id: "item-trash-old-card",
    title: "Expired Corporate Visa (2024)",
    category: "creditCard",
    vault: "Work",
    favorite: false,
    folder: "Finance",
    customFields: [
      { label: "Cardholder Name", value: "Alex J. Rivera" },
      { label: "Card Number", value: "4000 •••• •••• 1192", concealed: true },
      { label: "Expiration", value: "05/24" },
      { label: "Deleted Date", value: "2026-08-08 (20 days ago)" },
    ],
    notes: "Old physical corporate card expired and shredded.",
    createdAt: "2022-05-15 10:00",
    updatedAt: "2026-08-08 17:30",
  },
]
