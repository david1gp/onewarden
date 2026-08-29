import type { Accessor } from "solid-js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import { organizationMemberRoleLabelResolve } from "../api/organizationMemberRoleLabelResolve.js"
import { organizationMemberStatusLabelResolve } from "../api/organizationMemberStatusLabelResolve.js"
import { organizationMemberStatus } from "../schemas/organizationMemberStatus.js"

export interface OrganizationMemberDetailProps {
  member: Accessor<OrganizationMember | null>
  onBack?: () => void
  onEdit: (member: OrganizationMember) => void
  onReinvite: (memberId: string) => Promise<void>
  onRemove: (memberId: string) => Promise<void>
  onRestore: (memberId: string) => Promise<void>
  onRevoke: (memberId: string) => Promise<void>
}

export function organizationMemberDetailStateCreate(props: OrganizationMemberDetailProps) {
  const currentMember = () => props.member()

  const roleLabel = () => {
    const mem = currentMember()
    if (!mem) return ""
    return organizationMemberRoleLabelResolve(mem.type)
  }

  const statusInfo = () => {
    const mem = currentMember()
    if (!mem) return { label: "", variant: "subtle" as const }
    return organizationMemberStatusLabelResolve(mem.status)
  }

  const isInvited = () => {
    const mem = currentMember()
    return mem ? mem.status === organizationMemberStatus.invited : false
  }

  const isRevoked = () => {
    const mem = currentMember()
    return mem ? mem.status === organizationMemberStatus.revoked : false
  }

  const handleEditClick = () => {
    const mem = currentMember()
    if (mem) props.onEdit(mem)
  }

  const handleBackClick = () => props.onBack?.()

  const handleReinviteClick = () => {
    const mem = currentMember()
    if (mem) void props.onReinvite(mem.id)
  }

  const handleRevokeClick = () => {
    const mem = currentMember()
    if (mem) void props.onRevoke(mem.id)
  }

  const handleRestoreClick = () => {
    const mem = currentMember()
    if (mem) void props.onRestore(mem.id)
  }

  const handleRemoveClick = () => {
    const mem = currentMember()
    if (mem) void props.onRemove(mem.id)
  }

  return {
    handleBackClick,
    handleEditClick,
    handleReinviteClick,
    handleRemoveClick,
    handleRestoreClick,
    handleRevokeClick,
    isInvited,
    isRevoked,
    hasBack: () => Boolean(props.onBack),
    member: currentMember,
    roleLabel,
    statusInfo,
  }
}
