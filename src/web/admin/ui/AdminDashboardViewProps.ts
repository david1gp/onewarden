import type { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminDashboardViewProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onLogout: () => void
  onNavigateHome?: () => void
  pathname?: () => string
  search?: () => string
  hash?: () => string
  navigateReplace?: (path: string) => void
}
