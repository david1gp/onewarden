import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminOrganization } from "../model/adminOrganizationSchema.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminOrganizationsCardProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function adminOrganizationsCardStateCreate(props: AdminOrganizationsCardProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const organizations = createSignalObject<AdminOrganization[]>([])
  const isLoading = createSignalObject(false)
  const isDeleting = createSignalObject(false)
  const deleteTargetId = createSignalObject<string | null>(null)

  const loadOrganizations = async () => {
    isLoading.set(true)
    const result = await apiClient.organizationsList()
    isLoading.set(false)
    if (result.success) {
      organizations.set(result.data)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    loadOrganizations()
  })

  const handleDeleteOrganization = async (org: AdminOrganization) => {
    if (!window.confirm(`Are you sure you want to delete organization "${org.name}" and all its collections?`)) {
      return
    }
    isDeleting.set(true)
    deleteTargetId.set(org.id)
    const result = await apiClient.organizationDelete(org.id)
    isDeleting.set(false)
    deleteTargetId.set(null)

    if (result.success) {
      props.onNotifySuccess?.(`Organization "${org.name}" deleted.`)
      loadOrganizations()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    organizations: organizations.get,
    isLoading: isLoading.get,
    isDeleting: isDeleting.get,
    deleteTargetId: deleteTargetId.get,
    loadOrganizations,
    handleDeleteOrganization,
  }
}
