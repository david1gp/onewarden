export type OrganizationDomain = {
  uuid: string
  organizationUuid: string
  txt: string
  domainName: string
  creationDate: string
  nextRunDate: string
  jobRunCount: number
  verifiedDate: string | null
  lastCheckedDate: string | null
}
