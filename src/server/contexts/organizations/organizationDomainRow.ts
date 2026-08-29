export type OrganizationDomainRow = {
  uuid: string
  org_uuid: string
  txt: string
  domain_name: string
  creation_date: string
  next_run_date: string
  job_run_count: number
  verified_date: string | null
  last_checked_date: string | null
}
