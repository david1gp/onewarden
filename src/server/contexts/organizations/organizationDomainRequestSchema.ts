import * as v from "valibot"

export const organizationDomainRequestSchema = v.object({
  domainName: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255), v.check(organizationDomainNameIsValid)),
})

export type OrganizationDomainRequest = v.InferOutput<typeof organizationDomainRequestSchema>

function organizationDomainNameIsValid(value: string): boolean {
  if (value.endsWith(".") || value.includes("/") || value.includes(":") || value.includes("@")) return false
  return value.split(".").every((label) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u.test(label))
}
