import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon1 } from "#ui/interactive/button/ButtonIcon1.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationDomainListProps,
  organizationDomainListStateCreate,
} from "./organizationDomainListStateCreate.js"

export function OrganizationDomainList(props: OrganizationDomainListProps): JSX.Element {
  const state = organizationDomainListStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
      {/* Header */}
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-bold text-slate-900 text-xl dark:text-slate-100">Domain Verification</h2>
          <p class="mt-1 text-slate-500 text-xs dark:text-slate-400">
            Verify domain ownership using DNS TXT records to claim corporate domains and enable Single Sign-On.
          </p>
        </div>
        <ButtonIcon1
          variant="filled"
          size="sm"
          icon={vaultSvgIcons.plus}
          onClick={state.onCreateClick}
          class="gap-1 px-3 text-xs"
          iconClass="size-3.5 mr-1"
        >
          <span>Claim Domain</span>
        </ButtonIcon1>
      </div>

      {/* Domain Cards */}
      <div class="space-y-4">
        <For
          each={state.domains()}
          fallback={
            <div class="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 text-xs dark:border-slate-800 dark:bg-slate-900">
              <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={vaultSvgIcons.shieldCheck} />
                </svg>
              </div>
              <p class="font-semibold text-slate-800 text-sm dark:text-slate-200">No domains claimed yet</p>
              <p class="mt-1 text-slate-500">Claim your organization's email domain to automate onboarding and SSO.</p>
              <div class="mt-4">
                <Button variant="filled" size="sm" onClick={state.onCreateClick}>
                  Claim First Domain
                </Button>
              </div>
            </div>
          }
        >
          {(domain) => {
            const isVerified = () => Boolean(domain.verifiedDate)
            const isVerifying = () => state.verifyingDomainId() === domain.id
            const isCopied = () => state.copiedDomainId() === domain.id

            return (
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex items-start gap-3.5">
                    <div
                      class={`flex size-10 items-center justify-center rounded-xl font-bold text-sm ${
                        isVerified()
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                      }`}
                    >
                      <svg class="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={vaultSvgIcons.shieldCheck} />
                      </svg>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="font-bold text-slate-900 text-base dark:text-slate-100">{domain.domainName}</h3>
                        <Badge
                          variant={isVerified() ? "filledBlue" : "subtle"}
                          class={`text-[10px] px-2 py-0.5 ${
                            isVerified()
                              ? "bg-emerald-700 text-white"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {isVerified() ? "Verified" : "Unverified"}
                        </Badge>
                      </div>
                      <p class="mt-1 text-slate-500 text-xs dark:text-slate-400">
                        Added on {state.formatDate(domain.creationDate)}
                        <Show when={domain.verifiedDate}> • Verified on {state.formatDate(domain.verifiedDate)}</Show>
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <Show when={!isVerified()}>
                      <Button
                        variant="filled"
                        size="sm"
                        onClick={() => state.handleVerify(domain)}
                        disabled={isVerifying()}
                        class="h-8 text-xs"
                      >
                        {isVerifying() ? "Verifying DNS..." : "Verify DNS"}
                      </Button>
                    </Show>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => state.handleDelete(domain)}
                      class="h-8 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {/* DNS TXT Record Info */}
                <div class="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div>
                      <span class="font-semibold text-slate-700 dark:text-slate-300">DNS TXT Record:</span>
                      <p class="mt-0.5 font-mono text-[11px] text-slate-600 break-all dark:text-slate-400">
                        {domain.txt}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => state.handleCopyTxt(domain)}
                      class="h-7 shrink-0 text-xs"
                    >
                      {isCopied() ? "Copied!" : "Copy Record"}
                    </Button>
                  </div>
                </div>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
