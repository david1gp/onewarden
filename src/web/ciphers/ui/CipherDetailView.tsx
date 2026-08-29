import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { CipherAttachmentsSection } from "./CipherAttachmentsSection.jsx"
import { CipherCustomFieldsView } from "./CipherCustomFieldsView.jsx"
import { CipherDeleteDialog } from "./CipherDeleteDialog.jsx"
import { CipherPasswordHistoryDialog } from "./CipherPasswordHistoryDialog.jsx"
import { CipherShareDialog } from "./CipherShareDialog.jsx"
import { type CipherDetailViewStateProps, cipherDetailViewStateCreate } from "./cipherDetailViewStateCreate.js"

export function CipherDetailView(props: CipherDetailViewStateProps): JSX.Element {
  const state = cipherDetailViewStateCreate(props)

  return (
    <article class="flex h-full min-w-0 flex-col bg-slate-50/50 text-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
      <Show
        when={state.item()}
        fallback={
          <div class="flex h-full flex-col items-center justify-center p-6 text-center sm:p-8">
            <div class="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Icon path={vaultSvgIcons.lock} class="size-7" />
            </div>
            <p class="mt-4 font-semibold text-sm text-slate-800 dark:text-slate-200">No Cipher Selected</p>
            <p class="mt-1 max-w-xs text-xs text-slate-600 dark:text-slate-400">
              Select a cipher item from your vault to view stored credentials, secure notes, and metadata.
            </p>
          </div>
        }
      >
        {(item) => (
          <div class={`flex-1 overflow-y-auto ${classesScrollbar} p-4 sm:p-6`}>
            {/* Trash Banner if soft-deleted */}
            <Show when={state.isDeleted()}>
              <div class="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200">
                <div class="flex items-center gap-2">
                  <Icon path={vaultSvgIcons.trash} class="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <span>This cipher is in your Trash (deleted on {item().deletedDate}).</span>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs"
                    onClick={state.handleRestore}
                    disabled={state.isActionLoading()}
                  >
                    Restore Cipher
                  </Button>
                  <Button
                    variant="filledRed"
                    size="sm"
                    class="h-7 text-xs font-semibold"
                    onClick={() => state.openDeleteDialog(true)}
                    disabled={state.isActionLoading()}
                  >
                    Delete Permanently
                  </Button>
                </div>
              </div>
            </Show>

            {/* Error Banner */}
            <Show when={state.actionErrorMessage()}>
              {(err) => (
                <div class="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                  {err()}
                </div>
              )}
            </Show>

            {/* Header / Title Banner */}
            <div class="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5 sm:gap-4 dark:border-slate-800">
              <div class="flex min-w-0 items-start gap-3.5">
                <div
                  class={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-xs ${state.categoryTheme().bg} ${state.categoryTheme().text}`}
                >
                  <Icon path={state.categoryIcon()} class="size-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="break-words font-bold text-xl text-slate-900 tracking-tight dark:text-slate-50">
                    {item().name}
                  </h2>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={state.categoryTheme().badgeVariant} class="text-xs">
                      {state.categoryLabel()}
                    </Badge>
                    <Show when={item().folderName}>
                      <Badge variant="subtle" class="text-xs">
                        {item().folderName}
                      </Badge>
                    </Show>
                    <Show when={state.isArchived()}>
                      <Badge variant="outline" class="text-xs text-amber-700 border-amber-300">
                        Archived
                      </Badge>
                    </Show>
                    <Show when={item().organizationId}>
                      <Badge variant="outline" class="text-xs text-blue-700 border-blue-300">
                        Organization
                      </Badge>
                    </Show>
                    <Show when={item().revisionDate}>
                      <span class="text-xs text-slate-600 dark:text-slate-400">Updated {item().revisionDate}</span>
                    </Show>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div class="flex shrink-0 flex-wrap items-center gap-1.5">
                <ButtonIcon
                  variant="outline"
                  size="sm"
                  class="text-xs"
                  icon={item().favorite ? vaultSvgIcons.star : vaultSvgIcons.starOutline}
                  iconClass={`size-4 fill-current dark:fill-current ${
                    item().favorite ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"
                  }`}
                  onClick={() => state.toggleFavorite()}
                  aria-label={item().favorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  {item().favorite ? "Favorited" : "Favorite"}
                </ButtonIcon>

                <Show when={!state.isDeleted()}>
                  <Button variant="ghost" size="sm" class="text-xs" onClick={() => state.editItem()}>
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    onClick={() => state.openShareDialog()}
                    title={item().organizationId ? "Manage Collections" : "Share to Organization"}
                  >
                    <Icon path={vaultSvgIcons.share} class="size-3.5 mr-1" />
                    {item().organizationId ? "Collections" : "Share"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    onClick={() => state.handleClone()}
                    disabled={state.isActionLoading()}
                    title="Clone cipher item"
                  >
                    <Icon path={vaultSvgIcons.clone} class="size-3.5 mr-1" />
                    Clone
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    onClick={() => state.handleToggleArchive()}
                    disabled={state.isActionLoading()}
                    title={state.isArchived() ? "Unarchive cipher" : "Archive cipher"}
                  >
                    <Icon path={vaultSvgIcons.archive} class="size-3.5 mr-1" />
                    {state.isArchived() ? "Unarchive" : "Archive"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50"
                    onClick={() => state.openDeleteDialog(false)}
                    title="Move cipher to trash"
                  >
                    <Icon path={vaultSvgIcons.trash} class="size-3.5 mr-1" />
                    Trash
                  </Button>
                </Show>
              </div>
            </div>

            {/* Content Sections Grid */}
            <div class="max-w-3xl space-y-4">
              {/* Type 1: Login Details */}
              <Show
                when={
                  item().type === 1 &&
                  (item().login?.username ||
                    item().login?.password ||
                    item().login?.totp ||
                    (item().login?.uris && item().login!.uris!.length > 0))
                }
              >
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  {/* Username Field */}
                  <Show when={item().login?.username}>
                    <div class="group flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Username
                        </p>
                        <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                          {item().login?.username}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "username" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass={`size-3.5 fill-current dark:fill-current ${
                          state.copiedField() === "username"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => state.copyToClipboard("username", item().login?.username ?? "")}
                        aria-label={state.copiedField() === "username" ? "Copied username" : "Copy username"}
                      >
                        {state.copiedField() === "username" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* Password Field */}
                  <Show when={item().login?.password}>
                    <div class="group flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            Password
                          </p>
                          <Show when={item().passwordStrength}>
                            <Badge variant="filledGreen" class="px-1.5 py-0 text-[10px]">
                              {item().passwordStrength}
                            </Badge>
                          </Show>
                        </div>
                        <p class="truncate font-mono text-sm tracking-wider text-slate-900 select-all dark:text-slate-100">
                          {state.isPasswordRevealed() ? item().login?.password : "••••••••••••••••••••"}
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-1.5">
                        {/* History Button */}
                        <ButtonIcon
                          variant="ghost"
                          size="sm"
                          class="text-xs"
                          icon={vaultSvgIcons.history}
                          iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                          onClick={() => state.openHistoryDialog()}
                          aria-label="View password history"
                        >
                          {state.passwordHistoryCount() > 0 ? `History (${state.passwordHistoryCount()})` : "History"}
                        </ButtonIcon>

                        <ButtonIcon
                          variant="ghost"
                          size="sm"
                          class="text-xs"
                          icon={state.isPasswordRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                          iconClass="size-3.5 fill-current dark:fill-current text-slate-600 dark:text-slate-400"
                          onClick={() => state.togglePasswordReveal()}
                          aria-label={state.isPasswordRevealed() ? "Hide password" : "Show password"}
                        >
                          {state.isPasswordRevealed() ? "Hide" : "Show"}
                        </ButtonIcon>
                        <ButtonIcon
                          variant="subtle"
                          size="sm"
                          class="text-xs"
                          icon={state.copiedField() === "password" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                          iconClass={`size-3.5 fill-current dark:fill-current ${
                            state.copiedField() === "password"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                          onClick={() => state.copyToClipboard("password", item().login?.password ?? "")}
                          aria-label={state.copiedField() === "password" ? "Copied password" : "Copy password"}
                        >
                          {state.copiedField() === "password" ? "Copied" : "Copy"}
                        </ButtonIcon>
                      </div>
                    </div>
                  </Show>

                  {/* TOTP Field */}
                  <Show when={item().login?.totp}>
                    <div class="group flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            One-Time Password (2FA)
                          </p>
                          <span class="size-1.5 animate-pulse rounded-full bg-blue-700" />
                        </div>
                        <p class="truncate font-mono font-bold text-blue-700 text-lg tracking-wider select-all dark:text-blue-300">
                          {item().login?.totp}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "totp" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass={`size-3.5 fill-current dark:fill-current ${
                          state.copiedField() === "totp"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => state.copyToClipboard("totp", item().login?.totp?.replace(/\s+/g, "") ?? "")}
                        aria-label={state.copiedField() === "totp" ? "Copied OTP" : "Copy OTP"}
                      >
                        {state.copiedField() === "totp" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* URI / Website Field */}
                  <Show when={item().login?.uris && item().login!.uris!.length > 0}>
                    <div class="group flex items-center justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Website
                        </p>
                        <LinkTextExternal
                          href={item().login?.uris?.[0]?.uri ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex max-w-full items-center gap-1 font-medium text-blue-700 text-xs dark:text-blue-300"
                        >
                          <span class="truncate">{item().login?.uris?.[0]?.uri}</span>
                          <Icon path={vaultSvgIcons.externalLink} class="size-3 shrink-0" />
                        </LinkTextExternal>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "uri" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass={`size-3.5 fill-current dark:fill-current ${
                          state.copiedField() === "uri"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        onClick={() => state.copyToClipboard("uri", item().login?.uris?.[0]?.uri ?? "")}
                        aria-label={state.copiedField() === "uri" ? "Copied URL" : "Copy URL"}
                      >
                        {state.copiedField() === "uri" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>
                </CardWrapper>
              </Show>

              {/* Type 3: Payment Card Details */}
              <Show when={item().type === 3 && item().card}>
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                    <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Card Credentials</p>
                    <Badge variant="filledGreen" class="text-[10px]">
                      {state.cardBrand()}
                    </Badge>
                  </div>

                  {/* Cardholder Name */}
                  <Show when={item().card?.cardholderName}>
                    <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Cardholder Name
                        </p>
                        <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                          {item().card?.cardholderName}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "cardholder" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass="size-3.5"
                        onClick={() => state.copyToClipboard("cardholder", item().card?.cardholderName ?? "")}
                        aria-label="Copy Cardholder Name"
                      >
                        {state.copiedField() === "cardholder" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* Card Number */}
                  <Show when={item().card?.number}>
                    <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Card Number
                        </p>
                        <p class="truncate font-mono text-sm tracking-wider text-slate-900 select-all dark:text-slate-100">
                          {state.formattedCardNumber()}
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-1.5">
                        <ButtonIcon
                          variant="ghost"
                          size="sm"
                          class="text-xs"
                          icon={state.isCardNumberRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                          iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                          onClick={() => state.toggleCardNumberReveal()}
                          aria-label={state.isCardNumberRevealed() ? "Hide card number" : "Show card number"}
                        >
                          {state.isCardNumberRevealed() ? "Hide" : "Show"}
                        </ButtonIcon>
                        <ButtonIcon
                          variant="subtle"
                          size="sm"
                          class="text-xs"
                          icon={state.copiedField() === "cardNumber" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                          iconClass="size-3.5"
                          onClick={() =>
                            state.copyToClipboard("cardNumber", item().card?.number?.replace(/\s+/g, "") ?? "")
                          }
                          aria-label="Copy Card Number"
                        >
                          {state.copiedField() === "cardNumber" ? "Copied" : "Copy"}
                        </ButtonIcon>
                      </div>
                    </div>
                  </Show>

                  {/* Expiration & Security Code */}
                  <div class="grid grid-cols-2 gap-4">
                    <Show when={item().card?.expMonth || item().card?.expYear}>
                      <div>
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Expiration
                        </p>
                        <p class="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {item().card?.expMonth ?? "--"}/{item().card?.expYear ?? "--"}
                        </p>
                      </div>
                    </Show>

                    <Show when={item().card?.code}>
                      <div class="flex items-center justify-between gap-2">
                        <div>
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            Security Code (CVV)
                          </p>
                          <p class="font-mono text-sm text-slate-900 select-all dark:text-slate-100">
                            {state.isCvvRevealed() ? item().card?.code : "•••"}
                          </p>
                        </div>
                        <div class="flex items-center gap-1">
                          <ButtonIcon
                            variant="ghost"
                            size="sm"
                            class="text-xs"
                            icon={state.isCvvRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                            iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                            onClick={() => state.toggleCvvReveal()}
                            aria-label={state.isCvvRevealed() ? "Hide CVV" : "Show CVV"}
                          >
                            {state.isCvvRevealed() ? "Hide" : "Show"}
                          </ButtonIcon>
                          <ButtonIcon
                            variant="subtle"
                            size="sm"
                            class="text-xs"
                            icon={state.copiedField() === "cvv" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                            iconClass="size-3.5"
                            onClick={() => state.copyToClipboard("cvv", item().card?.code ?? "")}
                            aria-label="Copy CVV"
                          >
                            {state.copiedField() === "cvv" ? "Copied" : "Copy"}
                          </ButtonIcon>
                        </div>
                      </div>
                    </Show>
                  </div>
                </CardWrapper>
              </Show>

              {/* Type 4: Identity Details */}
              <Show when={item().type === 4 && item().identity}>
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Personal & Identity Profile</p>

                  {/* Full Name */}
                  <Show when={state.formattedIdentityFullName()}>
                    <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Full Name
                        </p>
                        <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                          {state.formattedIdentityFullName()}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "fullname" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass="size-3.5"
                        onClick={() => state.copyToClipboard("fullname", state.formattedIdentityFullName())}
                        aria-label="Copy Full Name"
                      >
                        {state.copiedField() === "fullname" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* Email & Phone */}
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Show when={item().identity?.email}>
                      <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            Email
                          </p>
                          <p class="truncate text-xs text-slate-900 select-all dark:text-slate-100">
                            {item().identity?.email}
                          </p>
                        </div>
                        <ButtonIcon
                          variant="subtle"
                          size="sm"
                          class="shrink-0 text-xs"
                          icon={state.copiedField() === "email" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                          iconClass="size-3.5"
                          onClick={() => state.copyToClipboard("email", item().identity?.email ?? "")}
                          aria-label="Copy Email"
                        >
                          {state.copiedField() === "email" ? "Copied" : "Copy"}
                        </ButtonIcon>
                      </div>
                    </Show>

                    <Show when={item().identity?.phone}>
                      <div class="flex items-center justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            Phone
                          </p>
                          <p class="truncate text-xs text-slate-900 select-all dark:text-slate-100">
                            {item().identity?.phone}
                          </p>
                        </div>
                        <ButtonIcon
                          variant="subtle"
                          size="sm"
                          class="shrink-0 text-xs"
                          icon={state.copiedField() === "phone" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                          iconClass="size-3.5"
                          onClick={() => state.copyToClipboard("phone", item().identity?.phone ?? "")}
                          aria-label="Copy Phone"
                        >
                          {state.copiedField() === "phone" ? "Copied" : "Copy"}
                        </ButtonIcon>
                      </div>
                    </Show>
                  </div>

                  {/* Address */}
                  <Show when={state.formattedIdentityAddress()}>
                    <div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Address
                        </p>
                        <p class="whitespace-pre-line text-xs text-slate-900 select-all dark:text-slate-100">
                          {state.formattedIdentityAddress()}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-xs"
                        icon={state.copiedField() === "address" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                        iconClass="size-3.5"
                        onClick={() => state.copyToClipboard("address", state.formattedIdentityAddress())}
                        aria-label="Copy Address"
                      >
                        {state.copiedField() === "address" ? "Copied" : "Copy"}
                      </ButtonIcon>
                    </div>
                  </Show>

                  {/* Official Identification (SSN, Passport, License) */}
                  <Show
                    when={item().identity?.ssn || item().identity?.passportNumber || item().identity?.licenseNumber}
                  >
                    <div class="space-y-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                      <Show when={item().identity?.ssn}>
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0 flex-1">
                            <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                              SSN / National ID
                            </p>
                            <p class="truncate font-mono text-xs text-slate-900 select-all dark:text-slate-100">
                              {state.isSsnRevealed() ? item().identity?.ssn : "•••-••-••••"}
                            </p>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <ButtonIcon
                              variant="ghost"
                              size="sm"
                              class="text-xs"
                              icon={state.isSsnRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                              iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                              onClick={() => state.toggleSsnReveal()}
                              aria-label={state.isSsnRevealed() ? "Hide SSN" : "Show SSN"}
                            >
                              {state.isSsnRevealed() ? "Hide" : "Show"}
                            </ButtonIcon>
                            <ButtonIcon
                              variant="subtle"
                              size="sm"
                              class="text-xs"
                              icon={state.copiedField() === "ssn" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                              iconClass="size-3.5"
                              onClick={() => state.copyToClipboard("ssn", item().identity?.ssn ?? "")}
                              aria-label="Copy SSN"
                            >
                              {state.copiedField() === "ssn" ? "Copied" : "Copy"}
                            </ButtonIcon>
                          </div>
                        </div>
                      </Show>

                      <Show when={item().identity?.passportNumber}>
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0 flex-1">
                            <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                              Passport Number
                            </p>
                            <p class="truncate font-mono text-xs text-slate-900 select-all dark:text-slate-100">
                              {state.isPassportRevealed() ? item().identity?.passportNumber : "•••••••••"}
                            </p>
                          </div>
                          <div class="flex items-center gap-1.5">
                            <ButtonIcon
                              variant="ghost"
                              size="sm"
                              class="text-xs"
                              icon={state.isPassportRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                              iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                              onClick={() => state.togglePassportReveal()}
                              aria-label={state.isPassportRevealed() ? "Hide Passport" : "Show Passport"}
                            >
                              {state.isPassportRevealed() ? "Hide" : "Show"}
                            </ButtonIcon>
                            <ButtonIcon
                              variant="subtle"
                              size="sm"
                              class="text-xs"
                              icon={state.copiedField() === "passport" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                              iconClass="size-3.5"
                              onClick={() => state.copyToClipboard("passport", item().identity?.passportNumber ?? "")}
                              aria-label="Copy Passport"
                            >
                              {state.copiedField() === "passport" ? "Copied" : "Copy"}
                            </ButtonIcon>
                          </div>
                        </div>
                      </Show>

                      <Show when={item().identity?.licenseNumber}>
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0 flex-1">
                            <p class="font-semibold text-[11px] text-slate-600 uppercase tracking-wider dark:text-slate-400">
                              Driver's License Number
                            </p>
                            <p class="truncate font-mono text-xs text-slate-900 select-all dark:text-slate-100">
                              {item().identity?.licenseNumber}
                            </p>
                          </div>
                          <ButtonIcon
                            variant="subtle"
                            size="sm"
                            class="text-xs"
                            icon={state.copiedField() === "license" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                            iconClass="size-3.5"
                            onClick={() => state.copyToClipboard("license", item().identity?.licenseNumber ?? "")}
                            aria-label="Copy License"
                          >
                            {state.copiedField() === "license" ? "Copied" : "Copy"}
                          </ButtonIcon>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </CardWrapper>
              </Show>

              {/* Custom Fields Section */}
              <CipherCustomFieldsView fields={state.customFields} />

              {/* Attachments Section */}
              <CipherAttachmentsSection
                item={state.item}
                onUploadAttachment={state.handleUploadAttachment}
                onDeleteAttachment={state.handleDeleteAttachment}
                readOnly={!item().edit}
              />

              {/* Secure Notes Section */}
              <Show when={item().notes}>
                <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div class="flex items-center justify-between">
                    <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Secure Notes</p>
                    <ButtonIcon
                      variant="subtle"
                      size="sm"
                      class="text-xs"
                      icon={state.copiedField() === "notes" ? vaultSvgIcons.check : vaultSvgIcons.copy}
                      iconClass="size-3.5"
                      onClick={() => state.copyToClipboard("notes", item().notes ?? "")}
                      aria-label="Copy Notes"
                    >
                      {state.copiedField() === "notes" ? "Copied" : "Copy"}
                    </ButtonIcon>
                  </div>
                  <pre class="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-slate-700 text-xs leading-relaxed dark:bg-slate-950 dark:text-slate-300">
                    {item().notes}
                  </pre>
                </CardWrapper>
              </Show>

              {/* Folder & Metadata Footer */}
              <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Metadata & Organization</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <Badge variant="subtle" class="text-xs">
                    {item().folderName ?? "No Folder"}
                  </Badge>
                  <Show when={item().organizationId}>
                    <Badge variant="outline" class="text-xs">
                      Organization: {item().organizationId}
                    </Badge>
                  </Show>
                  <Show when={item().collectionIds && item().collectionIds!.length > 0}>
                    <For each={item().collectionIds!}>
                      {(colId) => (
                        <Badge variant="filledBlue" class="text-xs">
                          {colId}
                        </Badge>
                      )}
                    </For>
                  </Show>
                </div>
                <div class="pt-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <Show when={item().creationDate}>
                    <span>Created {item().creationDate} · </span>
                  </Show>
                  <Show when={item().revisionDate}>
                    <span>Last modified {item().revisionDate}</span>
                  </Show>
                  <Show when={item().deletedDate}>
                    <span class="text-amber-700 dark:text-amber-300"> · In Trash since {item().deletedDate}</span>
                  </Show>
                </div>
              </CardWrapper>
            </div>

            {/* Sibling Dialogs */}
            <CipherPasswordHistoryDialog openSignal={state.isHistoryDialogOpen} item={state.item} />
            <CipherShareDialog
              openSignal={state.isShareDialogOpen}
              item={state.item}
              onShare={state.handleShareSubmit}
            />
            <CipherDeleteDialog
              openSignal={state.isDeleteDialogOpen}
              item={state.item}
              hardDelete={state.deleteHardMode()}
              onConfirm={state.handleConfirmDelete}
            />
          </div>
        )}
      </Show>
    </article>
  )
}
