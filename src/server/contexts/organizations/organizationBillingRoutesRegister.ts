import type { Hono } from "hono"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { organizationMemberMiddleware } from "./organizationMemberMiddleware.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"

type OrganizationBillingRouteOptions = Pick<
  OrganizationRouteOptions,
  "clock" | "database" | "publicKey" | "publicOrigin"
>

export function organizationBillingRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: OrganizationBillingRouteOptions,
): void {
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })
  const member = organizationMemberMiddleware({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  app.get("/api/plans", (context) =>
    context.json({
      object: "list",
      data: [
        {
          object: "plan",
          type: 0,
          product: 0,
          name: "Free",
          nameLocalizationKey: "planNameFree",
          bitwardenProduct: 0,
          maxUsers: 0,
          descriptionLocalizationKey: "planDescFree",
        },
        {
          object: "plan",
          type: 0,
          product: 1,
          name: "Free",
          nameLocalizationKey: "planNameFree",
          bitwardenProduct: 1,
          maxUsers: 0,
          descriptionLocalizationKey: "planDescFree",
        },
      ],
      continuationToken: null,
    }),
  )
  app.get("/api/organizations/:_org_id/billing/metadata", authenticate("get_billing_metadata"), member, (context) =>
    context.json({ object: "list", data: [], continuationToken: null }),
  )
  app.get(
    "/api/organizations/:_org_id/billing/vnext/warnings",
    authenticate("get_billing_warnings"),
    member,
    (context) =>
      context.json({
        freeTrial: null,
        inactiveSubscription: null,
        resellerRenewal: null,
        taxId: null,
      }),
  )
  app.get(
    "/api/organizations/:_org_id/billing/vnext/self-host/metadata",
    authenticate("get_self_host_billing_metadata"),
    member,
    (context) =>
      context.json({
        isOnSecretsManagerStandalone: false,
        organizationOccupiedSeats: 0,
      }),
  )
}
