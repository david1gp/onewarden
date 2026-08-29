import { createMemo, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationDomain } from "../schemas/organizationDomainSchema.js"

export interface OrganizationDomainListProps {
  domains: Accessor<OrganizationDomain[]>
  onCreateClick: () => void
  onDeleteDomain: (domainId: string) => Promise<boolean>
  onVerifyDomain: (domainId: string) => Promise<boolean>
}

export function organizationDomainListStateCreate(props: OrganizationDomainListProps) {
  const verifyingDomainIdSignal = createSignalObject<string | null>(null)
  const copiedDomainIdSignal = createSignalObject<string | null>(null)

  const sortedDomains = createMemo(() => {
    return [...props.domains()].sort((a, b) => a.domainName.localeCompare(b.domainName))
  })

  const handleVerify = async (domain: OrganizationDomain) => {
    verifyingDomainIdSignal.set(domain.id)
    try {
      await props.onVerifyDomain(domain.id)
    } finally {
      verifyingDomainIdSignal.set(null)
    }
  }

  const handleDelete = async (domain: OrganizationDomain) => {
    if (confirm(`Are you sure you want to remove domain "${domain.domainName}"?`)) {
      await props.onDeleteDomain(domain.id)
    }
  }

  const handleCopyTxt = async (domain: OrganizationDomain) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(domain.txt)
      copiedDomainIdSignal.set(domain.id)
      setTimeout(() => {
        if (copiedDomainIdSignal.get() === domain.id) {
          copiedDomainIdSignal.set(null)
        }
      }, 2000)
    }
  }

  const formatDate = (isoString: string | null | undefined): string => {
    if (!isoString) return "Never"
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        dateStyle: "medium",
      })
    } catch {
      return isoString
    }
  }

  return {
    copiedDomainId: copiedDomainIdSignal.get,
    domains: sortedDomains,
    formatDate,
    handleCopyTxt,
    handleDelete,
    handleVerify,
    onCreateClick: props.onCreateClick,
    verifyingDomainId: verifyingDomainIdSignal.get,
  }
}
