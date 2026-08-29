import { createEffect, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationSso } from "../schemas/organizationSsoSchema.js"
import type { OrganizationSsoInput } from "../schemas/organizationSsoInputSchema.js"

export interface OrganizationSsoCardProps {
  onSaveSso: (input: OrganizationSsoInput) => Promise<boolean>
  sso: Accessor<OrganizationSso | null>
}

export function organizationSsoCardStateCreate(props: OrganizationSsoCardProps) {
  const initialData = props.sso()
  const initialRaw = initialData?.Data as Record<string, unknown> | null

  const enabledSignal = createSignalObject(initialData?.Enabled ?? false)
  const identifierSignal = createSignalObject(initialData?.Identifier ?? "")
  const ssoTypeSignal = createSignalObject<"oidc" | "saml">(
    initialRaw?.SsoType === 2 || initialRaw?.ssoType === 2 ? "saml" : "oidc",
  )

  // OIDC Fields
  const authoritySignal = createSignalObject(typeof initialRaw?.Authority === "string" ? initialRaw.Authority : "")
  const clientIdSignal = createSignalObject(typeof initialRaw?.ClientId === "string" ? initialRaw.ClientId : "")
  const clientSecretSignal = createSignalObject(
    typeof initialRaw?.ClientSecret === "string" ? initialRaw.ClientSecret : "",
  )
  const metadataAddressSignal = createSignalObject(
    typeof initialRaw?.MetadataAddress === "string" ? initialRaw.MetadataAddress : "",
  )

  // SAML Fields
  const samlEntityIdSignal = createSignalObject(typeof initialRaw?.EntityId === "string" ? initialRaw.EntityId : "")
  const samlBindingSignal = createSignalObject("Redirect")
  const samlSigningBehaviorSignal = createSignalObject("IfIdpWantAuthnRequestsSigned")

  const isSubmittingSignal = createSignalObject(false)
  const errorMessageSignal = createSignalObject<string | null>(null)
  const successMessageSignal = createSignalObject<string | null>(null)

  createEffect(() => {
    const ssoData = props.sso()
    if (ssoData) {
      enabledSignal.set(ssoData.Enabled)
      identifierSignal.set(ssoData.Identifier ?? "")

      const raw = ssoData.Data as Record<string, unknown> | null
      if (raw) {
        if (typeof raw.Authority === "string") authoritySignal.set(raw.Authority)
        if (typeof raw.ClientId === "string") clientIdSignal.set(raw.ClientId)
        if (typeof raw.ClientSecret === "string") clientSecretSignal.set(raw.ClientSecret)
        if (typeof raw.MetadataAddress === "string") metadataAddressSignal.set(raw.MetadataAddress)
        if (raw.SsoType === 2 || raw.ssoType === 2) {
          ssoTypeSignal.set("saml")
        } else {
          ssoTypeSignal.set("oidc")
        }
      }
    }
  })

  const urls = () => props.sso()?.Urls ?? null

  const handleEnabledToggle = (checked: boolean) => {
    enabledSignal.set(checked)
  }

  const handleIdentifierInput = (e: Event) => {
    identifierSignal.set((e.target as HTMLInputElement).value)
  }

  const handleSsoTypeChange = (type: "oidc" | "saml") => {
    ssoTypeSignal.set(type)
  }

  const handleAuthorityInput = (e: Event) => {
    authoritySignal.set((e.target as HTMLInputElement).value)
  }

  const handleClientIdInput = (e: Event) => {
    clientIdSignal.set((e.target as HTMLInputElement).value)
  }

  const handleClientSecretInput = (e: Event) => {
    clientSecretSignal.set((e.target as HTMLInputElement).value)
  }

  const handleMetadataAddressInput = (e: Event) => {
    metadataAddressSignal.set((e.target as HTMLInputElement).value)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    isSubmittingSignal.set(true)
    errorMessageSignal.set(null)
    successMessageSignal.set(null)

    const isOidc = ssoTypeSignal.get() === "oidc"
    const dataPayload: Record<string, unknown> = isOidc
      ? {
          AllowUnsolicitedSso: true,
          Authority: authoritySignal.get().trim(),
          ClientId: clientIdSignal.get().trim(),
          ClientSecret: clientSecretSignal.get().trim(),
          MetadataAddress: metadataAddressSignal.get().trim() || null,
          SsoType: 1,
        }
      : {
          Binding: samlBindingSignal.get(),
          EntityId: samlEntityIdSignal.get().trim(),
          SigningBehavior: samlSigningBehaviorSignal.get(),
          SsoType: 2,
        }

    const input: OrganizationSsoInput = {
      data: dataPayload,
      enabled: enabledSignal.get(),
      identifier: identifierSignal.get().trim() || null,
    }

    try {
      const success = await props.onSaveSso(input)
      if (success) {
        successMessageSignal.set("SSO configuration saved successfully.")
      }
    } catch {
      errorMessageSignal.set("Failed to save SSO configuration.")
    } finally {
      isSubmittingSignal.set(false)
    }
  }

  return {
    authority: authoritySignal.get,
    clientId: clientIdSignal.get,
    clientSecret: clientSecretSignal.get,
    enabled: enabledSignal.get,
    errorMessage: errorMessageSignal.get,
    handleAuthorityInput,
    handleClientIdInput,
    handleClientSecretInput,
    handleEnabledToggle,
    handleIdentifierInput,
    handleMetadataAddressInput,
    handleSsoTypeChange,
    handleSubmit,
    identifier: identifierSignal.get,
    isSubmitting: isSubmittingSignal.get,
    metadataAddress: metadataAddressSignal.get,
    ssoType: ssoTypeSignal.get,
    successMessage: successMessageSignal.get,
    urls,
  }
}
