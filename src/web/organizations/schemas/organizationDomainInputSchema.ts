import * as v from "valibot"

export const organizationDomainInputSchema = v.object({
  domainName: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Domain name is required"),
    v.regex(
      /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i,
      "Please enter a valid domain (e.g. example.com)",
    ),
  ),
})

export type OrganizationDomainInput = v.InferOutput<typeof organizationDomainInputSchema>
