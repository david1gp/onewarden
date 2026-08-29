import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { type OrganizationSsoCardProps, organizationSsoCardStateCreate } from "./organizationSsoCardStateCreate.js"

export function OrganizationSsoCard(props: OrganizationSsoCardProps): JSX.Element {
  const state = organizationSsoCardStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
      <div class="max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h2 class="font-bold text-slate-900 text-xl dark:text-slate-100">Single Sign-On (SSO) Configuration</h2>
          <p class="mt-1 text-slate-500 text-xs dark:text-slate-400">
            Allow members to log into their OneWarden vault using your enterprise Identity Provider (IdP).
          </p>
        </div>

        <Show when={state.errorMessage()}>
          {(msg) => (
            <div class="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
              {msg()}
            </div>
          )}
        </Show>

        <Show when={state.successMessage()}>
          {(msg) => (
            <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-medium dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {msg()}
            </div>
          )}
        </Show>

        <form onSubmit={state.handleSubmit} class="space-y-6">
          {/* SSO Enable Switch */}
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-slate-900 text-sm dark:text-slate-100">Enable Single Sign-On</span>
                <p class="text-slate-500 text-xs dark:text-slate-400">
                  Allow organization members to authenticate with your configured Identity Provider.
                </p>
              </div>
              <Checkbox checked={state.enabled()} onChange={state.handleEnabledToggle} />
            </div>
          </div>

          {/* Organization Identifier */}
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h3 class="font-bold text-slate-900 text-sm dark:text-slate-100">Organization SSO Identifier</h3>
            <p class="mt-1 text-slate-500 text-xs dark:text-slate-400">
              A unique identifier used by users during SSO vault login (e.g. acme-corp).
            </p>
            <div class="mt-3">
              <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="sso-identifier">
                SSO Identifier
              </label>
              <Input
                id="sso-identifier"
                type="text"
                placeholder="acme-corp"
                value={state.identifier()}
                onInput={state.handleIdentifierInput}
                class="mt-1 w-full max-w-md"
              />
            </div>
          </div>

          {/* Protocol Selection & Configuration */}
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h3 class="font-bold text-slate-900 text-sm dark:text-slate-100">Identity Provider Settings</h3>
            <div class="mt-4 flex items-center gap-3">
              <Button
                type="button"
                variant={state.ssoType() === "oidc" ? "filled" : "outline"}
                size="sm"
                onClick={() => state.handleSsoTypeChange("oidc")}
                class="text-xs"
              >
                OpenID Connect (OIDC)
              </Button>
              <Button
                type="button"
                variant={state.ssoType() === "saml" ? "filled" : "outline"}
                size="sm"
                onClick={() => state.handleSsoTypeChange("saml")}
                class="text-xs"
              >
                SAML 2.0
              </Button>
            </div>

            {/* OIDC Config Fields */}
            <Show when={state.ssoType() === "oidc"}>
              <div class="mt-5 space-y-4">
                <div>
                  <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="sso-authority">
                    Authority / Issuer URL
                  </label>
                  <Input
                    id="sso-authority"
                    type="url"
                    placeholder="https://login.microsoftonline.com/... or https://accounts.google.com"
                    value={state.authority()}
                    onInput={state.handleAuthorityInput}
                    class="mt-1 w-full"
                  />
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="sso-client-id">
                      Client ID
                    </label>
                    <Input
                      id="sso-client-id"
                      type="text"
                      placeholder="OAuth2 Client ID"
                      value={state.clientId()}
                      onInput={state.handleClientIdInput}
                      class="mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="sso-client-secret">
                      Client Secret
                    </label>
                    <Input
                      id="sso-client-secret"
                      type="password"
                      placeholder="OAuth2 Client Secret"
                      value={state.clientSecret()}
                      onInput={state.handleClientSecretInput}
                      class="mt-1 w-full"
                    />
                  </div>
                </div>
                <div>
                  <label
                    class="block font-medium text-slate-700 text-xs dark:text-slate-300"
                    for="sso-metadata-address"
                  >
                    Metadata Address (Optional)
                  </label>
                  <Input
                    id="sso-metadata-address"
                    type="url"
                    placeholder="https://.../.well-known/openid-configuration"
                    value={state.metadataAddress()}
                    onInput={state.handleMetadataAddressInput}
                    class="mt-1 w-full"
                  />
                </div>
              </div>
            </Show>

            {/* SAML Config Fields */}
            <Show when={state.ssoType() === "saml"}>
              <div class="mt-5 space-y-4">
                <div>
                  <label class="block font-medium text-slate-700 text-xs dark:text-slate-300" for="sso-saml-entity">
                    IdP Entity ID
                  </label>
                  <Input
                    id="sso-saml-entity"
                    type="text"
                    placeholder="https://sts.windows.net/... or IdP Entity ID"
                    value={state.authority()}
                    onInput={state.handleAuthorityInput}
                    class="mt-1 w-full"
                  />
                </div>
              </div>
            </Show>
          </div>

          {/* Service Provider Endpoints Card */}
          <Show when={state.urls()}>
            {(urls) => (
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <h3 class="font-bold text-slate-900 text-sm dark:text-slate-100">Service Provider (SP) Endpoints</h3>
                <p class="mt-1 text-slate-500 text-xs dark:text-slate-400">
                  Provide these URLs to your Identity Provider during application registration.
                </p>
                <div class="mt-4 space-y-3 font-mono text-[11px]">
                  <div>
                    <span class="text-slate-500 font-sans font-semibold dark:text-slate-400">
                      Callback / Redirect URI:
                    </span>
                    <p class="mt-0.5 rounded bg-slate-50 p-2 text-slate-800 break-all dark:bg-slate-800 dark:text-slate-200">
                      {urls().CallbackPath}
                    </p>
                  </div>
                  <div>
                    <span class="text-slate-500 font-sans font-semibold dark:text-slate-400">SAML SP Entity ID:</span>
                    <p class="mt-0.5 rounded bg-slate-50 p-2 text-slate-800 break-all dark:bg-slate-800 dark:text-slate-200">
                      {urls().SpEntityId}
                    </p>
                  </div>
                  <div>
                    <span class="text-slate-500 font-sans font-semibold dark:text-slate-400">SAML ACS URL:</span>
                    <p class="mt-0.5 rounded bg-slate-50 p-2 text-slate-800 break-all dark:bg-slate-800 dark:text-slate-200">
                      {urls().SpAcsUrl}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Show>

          {/* Save Button */}
          <div class="flex items-center justify-end">
            <Button variant="filled" size="sm" type="submit" disabled={state.isSubmitting()}>
              {state.isSubmitting() ? "Saving SSO Settings..." : "Save SSO Configuration"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
