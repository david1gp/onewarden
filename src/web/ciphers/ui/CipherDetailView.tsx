import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { CopyActionButton } from "../../../ui/interactive/button/CopyActionButton.jsx"
import { LabeledValueRow } from "../../../ui/static/value/LabeledValueRow.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { CipherAttachmentsSection } from "./CipherAttachmentsSection.jsx"
import { CipherCustomFieldsView } from "./CipherCustomFieldsView.jsx"
import { CipherDeleteDialog } from "./CipherDeleteDialog.jsx"
import { CipherPasswordHistoryList } from "./CipherPasswordHistoryList.jsx"
import { CipherShareDialog } from "./CipherShareDialog.jsx"
import { type CipherDetailViewStateProps, cipherDetailViewStateCreate } from "./cipherDetailViewStateCreate.js"

export function CipherDetailView(props: CipherDetailViewStateProps): JSX.Element {
  const state = cipherDetailViewStateCreate(props)

  return (
    <article class="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-slate-50/50 text-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
      <Show
        when={state.item()}
        fallback={
          <div class="flex h-full flex-col items-center justify-center p-6 text-center sm:p-8">
            <div class="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Icon path={vaultSvgIcons.lock} class="size-7" />
            </div>
            <p class="mt-4 font-semibold text-sm text-slate-800 dark:text-slate-200">No Cipher Selected</p>
            <p class="mt-1 max-w-xs text-sm text-slate-600 dark:text-slate-400">
              Select a cipher item from your vault to view stored credentials, secure notes, and metadata.
            </p>
          </div>
        }
      >
        {(item) => (
          <div class={`@container min-h-0 min-w-0 flex-1 overflow-y-auto ${classesScrollbar} p-4 sm:p-6`}>
            {/* Trash Banner if soft-deleted */}
            <Show when={state.isDeleted()}>
              <div class="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200">
                <div class="flex items-center gap-2">
                  <Icon path={vaultSvgIcons.trash} class="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                  <span>This cipher is in your Trash (deleted on {item().deletedDate}).</span>
                </div>
                <div class="flex items-center gap-2">
                  <Show when={item().permissions?.restore !== false}>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm"
                      onClick={state.handleRestore}
                      disabled={state.isActionLoading()}
                    >
                      <Icon path={vaultSvgIcons.restore} class="mr-1.5 size-3.5" />
                      Restore Cipher
                    </Button>
                  </Show>
                  <Show when={item().permissions?.delete !== false}>
                    <Button
                      variant="filledRed"
                      size="sm"
                      class="h-8 text-sm font-semibold"
                      onClick={() => state.openDeleteDialog(true)}
                      disabled={state.isActionLoading()}
                    >
                      <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                      Delete Permanently
                    </Button>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Error Banner */}
            <Show when={state.actionErrorMessage()}>
              {(err) => (
                <div class="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                  {err()}
                </div>
              )}
            </Show>

            {/* Header / Title Banner */}
            <div class="mb-4">
              <div class="flex min-w-0 items-start gap-3.5">
                <div
                  class={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-xs ${state.categoryTheme().bg} ${state.categoryTheme().text}`}
                >
                  <Icon path={state.categoryIcon()} class="size-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <h2
                    class="truncate font-bold text-xl text-slate-900 tracking-tight dark:text-slate-50"
                    title={item().name}
                  >
                    {item().name}
                  </h2>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={state.categoryTheme().badgeVariant} class="max-w-full truncate text-sm">
                      {state.categoryLabel()}
                    </Badge>
                    <Show when={item().folderName}>
                      <Badge variant="subtle" class="max-w-full truncate text-sm">
                        {item().folderName}
                      </Badge>
                    </Show>
                    <Show when={state.isArchived()}>
                      <Badge variant="outline" class="text-sm text-amber-700 border-amber-300">
                        Archived
                      </Badge>
                    </Show>
                    <Show when={item().organizationId}>
                      <Badge variant="outline" class="text-sm text-blue-700 border-blue-300">
                        Organization
                      </Badge>
                    </Show>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div class="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
                <Show when={!state.isDeleted() && item().edit !== false && item().permissions?.delete !== false}>
                  <Button variant="contrast" size="sm" class="h-8 w-full text-sm" onClick={() => state.editItem()}>
                    <Icon path={vaultSvgIcons.edit} class="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                </Show>

                <Show when={item().edit !== false}>
                  <ButtonIcon
                    variant="outline"
                    size="sm"
                    class="h-8 w-full text-sm"
                    icon={item().favorite ? vaultSvgIcons.star : vaultSvgIcons.starOutline}
                    iconClass={`size-4 fill-current dark:fill-current ${
                      item().favorite ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"
                    }`}
                    onClick={() => state.toggleFavorite()}
                    aria-label={item().favorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    {item().favorite ? "Favorited" : "Favorite"}
                  </ButtonIcon>
                </Show>

                <Show when={!state.isDeleted() && item().edit !== false && item().permissions?.delete !== false}>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-full text-sm"
                    onClick={() => state.openShareDialog()}
                    title={item().organizationId ? "Manage Collections" : "Share to Organization"}
                  >
                    <Icon path={vaultSvgIcons.share} class="size-3.5 mr-1" />
                    {item().organizationId ? "Collections" : "Share"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-8 w-full text-sm"
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
                    class="h-8 w-full text-sm"
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
                    class="h-8 w-full text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50"
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
            <div class="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-2">
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
                <div class="space-y-4">
                  <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    {/* Username Field */}
                    <Show when={item().login?.username}>
                      <LabeledValueRow
                        class="group gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80"
                        label="Username"
                        labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                        value={
                          <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                            {item().login?.username}
                          </p>
                        }
                        action={
                          <CopyActionButton
                            isCopied={state.copiedField() === "username"}
                            label="Copy"
                            copiedLabel="Copied"
                            ariaLabel="Copy username"
                            copiedAriaLabel="Copied username"
                            variant="subtle"
                            size="sm"
                            class="h-8 shrink-0 text-sm"
                            iconClass={`size-3.5 fill-current dark:fill-current ${
                              state.copiedField() === "username"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                            onCopy={() => state.copyToClipboard("username", item().login?.username ?? "")}
                          />
                        }
                      />
                    </Show>

                    {/* Password Field */}
                    <Show when={item().login?.password}>
                      <LabeledValueRow
                        class="group gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80"
                        label="Password"
                        labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                        value={
                          <p class="truncate font-mono text-sm tracking-wider text-slate-900 select-all dark:text-slate-100">
                            {state.canViewPassword() && state.isPasswordRevealed()
                              ? item().login?.password
                              : "••••••••••••••••••••"}
                          </p>
                        }
                        actionClass="gap-1.5"
                        action={
                          <Show when={state.canViewPassword()}>
                            <ButtonIcon
                              variant="ghost"
                              size="sm"
                              class="h-8 text-sm"
                              icon={state.isPasswordRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                              iconClass="size-3.5 fill-current dark:fill-current text-slate-600 dark:text-slate-400"
                              onClick={() => state.togglePasswordReveal()}
                              aria-label={state.isPasswordRevealed() ? "Hide password" : "Show password"}
                            >
                              {state.isPasswordRevealed() ? "Hide" : "Show"}
                            </ButtonIcon>
                            <CopyActionButton
                              isCopied={state.copiedField() === "password"}
                              label="Copy"
                              copiedLabel="Copied"
                              ariaLabel="Copy password"
                              copiedAriaLabel="Copied password"
                              variant="subtle"
                              size="sm"
                              class="h-8 text-sm"
                              iconClass={`size-3.5 fill-current dark:fill-current ${
                                state.copiedField() === "password"
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-slate-600 dark:text-slate-400"
                              }`}
                              onCopy={() => state.copyToClipboard("password", item().login?.password ?? "")}
                            />
                          </Show>
                        }
                      />
                    </Show>

                    {/* TOTP Field */}
                    <Show when={item().login?.totp}>
                      <LabeledValueRow
                        class="group gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80"
                        label={
                          <>
                            <span class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">
                              One-Time Password (2FA)
                            </span>
                            <span class="size-1.5 animate-pulse rounded-full bg-blue-700" />
                          </>
                        }
                        labelClass="flex items-center gap-1.5"
                        value={
                          <p class="truncate font-mono font-bold text-blue-700 text-lg tracking-wider select-all dark:text-blue-300">
                            {item().login?.totp}
                          </p>
                        }
                        action={
                          <CopyActionButton
                            isCopied={state.copiedField() === "totp"}
                            label="Copy"
                            copiedLabel="Copied"
                            ariaLabel="Copy OTP"
                            copiedAriaLabel="Copied OTP"
                            variant="subtle"
                            size="sm"
                            class="h-8 shrink-0 text-sm"
                            iconClass={`size-3.5 fill-current dark:fill-current ${
                              state.copiedField() === "totp"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                            onCopy={() => state.copyToClipboard("totp", item().login?.totp?.replace(/\s+/g, "") ?? "")}
                          />
                        }
                      />
                    </Show>

                    {/* URI / Website Field */}
                    <Show when={item().login?.uris && item().login!.uris!.length > 0}>
                      <div class="group flex items-center justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <p class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">
                            Website
                          </p>
                          <LinkTextExternal
                            href={item().login?.uris?.[0]?.uri ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex max-w-full items-center gap-1 font-medium text-blue-700 text-sm dark:text-blue-300"
                          >
                            <span class="truncate">{item().login?.uris?.[0]?.uri}</span>
                            <Icon path={vaultSvgIcons.externalLink} class="size-3 shrink-0" />
                          </LinkTextExternal>
                        </div>
                        <ButtonIcon
                          variant="subtle"
                          size="sm"
                          class="h-8 shrink-0 text-sm"
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
                  <Show when={state.canViewPassword() && (item().passwordHistory?.length ?? 0) > 0}>
                    <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                      <h3 class="font-semibold text-slate-900 text-sm dark:text-slate-100">Password History</h3>
                      <CipherPasswordHistoryList entries={() => item().passwordHistory ?? []} />
                    </CardWrapper>
                  </Show>
                </div>
              </Show>

              {/* Type 3: Payment Card Details */}
              <Show when={item().type === 3 && item().card}>
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800/80">
                    <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Card Credentials</p>
                    <Badge variant="filledGreen" class="text-sm">
                      {state.cardBrand()}
                    </Badge>
                  </div>

                  {/* Cardholder Name */}
                  <Show when={item().card?.cardholderName}>
                    <LabeledValueRow
                      class="gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80"
                      label="Cardholder Name"
                      labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                      value={
                        <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                          {item().card?.cardholderName}
                        </p>
                      }
                      action={
                        <CopyActionButton
                          isCopied={state.copiedField() === "cardholder"}
                          label="Copy"
                          copiedLabel="Copied"
                          ariaLabel="Copy Cardholder Name"
                          variant="subtle"
                          size="sm"
                          class="h-8 shrink-0 text-sm"
                          iconClass="size-3.5"
                          onCopy={() => state.copyToClipboard("cardholder", item().card?.cardholderName ?? "")}
                        />
                      }
                    />
                  </Show>

                  {/* Card Number */}
                  <Show when={item().card?.number}>
                    <LabeledValueRow
                      class="gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80"
                      label="Card Number"
                      labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                      value={
                        <p class="truncate font-mono text-sm tracking-wider text-slate-900 select-all dark:text-slate-100">
                          {state.formattedCardNumber()}
                        </p>
                      }
                      actionClass="gap-1.5"
                      action={
                        <>
                          <ButtonIcon
                            variant="ghost"
                            size="sm"
                            class="h-8 text-sm"
                            icon={state.isCardNumberRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                            iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                            onClick={() => state.toggleCardNumberReveal()}
                            aria-label={state.isCardNumberRevealed() ? "Hide card number" : "Show card number"}
                          >
                            {state.isCardNumberRevealed() ? "Hide" : "Show"}
                          </ButtonIcon>
                          <CopyActionButton
                            isCopied={state.copiedField() === "cardNumber"}
                            label="Copy"
                            copiedLabel="Copied"
                            ariaLabel="Copy Card Number"
                            variant="subtle"
                            size="sm"
                            class="h-8 text-sm"
                            iconClass="size-3.5"
                            onCopy={() =>
                              state.copyToClipboard("cardNumber", item().card?.number?.replace(/\s+/g, "") ?? "")
                            }
                          />
                        </>
                      }
                    />
                  </Show>

                  {/* Expiration & Security Code */}
                  <div class="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
                    <Show when={item().card?.expMonth || item().card?.expYear}>
                      <div>
                        <p class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Expiration
                        </p>
                        <p class="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {item().card?.expMonth ?? "--"}/{item().card?.expYear ?? "--"}
                        </p>
                      </div>
                    </Show>

                    <Show when={item().card?.code}>
                      <LabeledValueRow
                        class="gap-2"
                        label="Security Code (CVV)"
                        labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                        value={
                          <p class="font-mono text-sm text-slate-900 select-all dark:text-slate-100">
                            {state.isCvvRevealed() ? item().card?.code : "•••"}
                          </p>
                        }
                        actionClass="gap-1"
                        action={
                          <>
                            <ButtonIcon
                              variant="ghost"
                              size="sm"
                              class="h-8 text-sm"
                              icon={state.isCvvRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                              iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                              onClick={() => state.toggleCvvReveal()}
                              aria-label={state.isCvvRevealed() ? "Hide CVV" : "Show CVV"}
                            >
                              {state.isCvvRevealed() ? "Hide" : "Show"}
                            </ButtonIcon>
                            <CopyActionButton
                              isCopied={state.copiedField() === "cvv"}
                              label="Copy"
                              copiedLabel="Copied"
                              ariaLabel="Copy CVV"
                              variant="subtle"
                              size="sm"
                              class="h-8 text-sm"
                              iconClass="size-3.5"
                              onCopy={() => state.copyToClipboard("cvv", item().card?.code ?? "")}
                            />
                          </>
                        }
                      />
                    </Show>
                  </div>
                </CardWrapper>
              </Show>

              {/* Type 4: Identity Details */}
              <Show when={item().type === 4 && item().identity}>
                <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Personal & Identity Profile</p>

                  {/* Full Name */}
                  <Show when={state.formattedIdentityFullName()}>
                    <LabeledValueRow
                      class="gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80"
                      label="Full Name"
                      labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                      value={
                        <p class="truncate font-medium text-sm text-slate-900 select-all dark:text-slate-100">
                          {state.formattedIdentityFullName()}
                        </p>
                      }
                      action={
                        <CopyActionButton
                          isCopied={state.copiedField() === "fullname"}
                          label="Copy"
                          copiedLabel="Copied"
                          ariaLabel="Copy Full Name"
                          variant="subtle"
                          size="sm"
                          class="h-8 shrink-0 text-sm"
                          iconClass="size-3.5"
                          onCopy={() => state.copyToClipboard("fullname", state.formattedIdentityFullName())}
                        />
                      }
                    />
                  </Show>

                  {/* Email & Phone */}
                  <Show when={item().identity?.username}>
                    <LabeledValueRow
                      class="gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/80"
                      label="Username"
                      labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                      value={
                        <p class="truncate text-sm text-slate-900 select-all dark:text-slate-100">
                          {item().identity?.username}
                        </p>
                      }
                      action={
                        <CopyActionButton
                          isCopied={state.copiedField() === "identity-username"}
                          label="Copy"
                          copiedLabel="Copied"
                          ariaLabel="Copy Identity Username"
                          variant="subtle"
                          size="sm"
                          class="h-8 shrink-0 text-sm"
                          iconClass="size-3.5"
                          onCopy={() => state.copyToClipboard("identity-username", item().identity?.username ?? "")}
                        />
                      }
                    />
                  </Show>

                  <div class="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
                    <Show when={item().identity?.email}>
                      <LabeledValueRow
                        class="gap-2"
                        label="Email"
                        labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                        value={
                          <p class="truncate text-sm text-slate-900 select-all dark:text-slate-100">
                            {item().identity?.email}
                          </p>
                        }
                        action={
                          <CopyActionButton
                            isCopied={state.copiedField() === "email"}
                            label="Copy"
                            copiedLabel="Copied"
                            ariaLabel="Copy Email"
                            variant="subtle"
                            size="sm"
                            class="h-8 shrink-0 text-sm"
                            iconClass="size-3.5"
                            onCopy={() => state.copyToClipboard("email", item().identity?.email ?? "")}
                          />
                        }
                      />
                    </Show>

                    <Show when={item().identity?.phone}>
                      <LabeledValueRow
                        class="gap-2"
                        label="Phone"
                        labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                        value={
                          <p class="truncate text-sm text-slate-900 select-all dark:text-slate-100">
                            {item().identity?.phone}
                          </p>
                        }
                        action={
                          <CopyActionButton
                            isCopied={state.copiedField() === "phone"}
                            label="Copy"
                            copiedLabel="Copied"
                            ariaLabel="Copy Phone"
                            variant="subtle"
                            size="sm"
                            class="shrink-0 text-sm"
                            iconClass="size-3.5"
                            onCopy={() => state.copyToClipboard("phone", item().identity?.phone ?? "")}
                          />
                        }
                      />
                    </Show>
                  </div>

                  {/* Address */}
                  <Show when={state.formattedIdentityAddress()}>
                    <div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">
                          Address
                        </p>
                        <p class="whitespace-pre-line text-sm text-slate-900 select-all dark:text-slate-100">
                          {state.formattedIdentityAddress()}
                        </p>
                      </div>
                      <ButtonIcon
                        variant="subtle"
                        size="sm"
                        class="shrink-0 text-sm"
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
                        <LabeledValueRow
                          class="gap-2"
                          label="SSN / National ID"
                          labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                          value={
                            <p class="truncate font-mono text-sm text-slate-900 select-all dark:text-slate-100">
                              {state.isSsnRevealed() ? item().identity?.ssn : "•••-••-••••"}
                            </p>
                          }
                          actionClass="gap-1.5"
                          action={
                            <>
                              <ButtonIcon
                                variant="ghost"
                                size="sm"
                                class="h-8 text-sm"
                                icon={state.isSsnRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                                iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                                onClick={() => state.toggleSsnReveal()}
                                aria-label={state.isSsnRevealed() ? "Hide SSN" : "Show SSN"}
                              >
                                {state.isSsnRevealed() ? "Hide" : "Show"}
                              </ButtonIcon>
                              <CopyActionButton
                                isCopied={state.copiedField() === "ssn"}
                                label="Copy"
                                copiedLabel="Copied"
                                ariaLabel="Copy SSN"
                                variant="subtle"
                                size="sm"
                                class="h-8 text-sm"
                                iconClass="size-3.5"
                                onCopy={() => state.copyToClipboard("ssn", item().identity?.ssn ?? "")}
                              />
                            </>
                          }
                        />
                      </Show>

                      <Show when={item().identity?.passportNumber}>
                        <LabeledValueRow
                          class="gap-2"
                          label="Passport Number"
                          labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                          value={
                            <p class="truncate font-mono text-sm text-slate-900 select-all dark:text-slate-100">
                              {state.isPassportRevealed() ? item().identity?.passportNumber : "•••••••••"}
                            </p>
                          }
                          actionClass="gap-1.5"
                          action={
                            <>
                              <ButtonIcon
                                variant="ghost"
                                size="sm"
                                class="h-8 text-sm"
                                icon={state.isPassportRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                                iconClass="size-3.5 text-slate-600 dark:text-slate-400"
                                onClick={() => state.togglePassportReveal()}
                                aria-label={state.isPassportRevealed() ? "Hide Passport" : "Show Passport"}
                              >
                                {state.isPassportRevealed() ? "Hide" : "Show"}
                              </ButtonIcon>
                              <CopyActionButton
                                isCopied={state.copiedField() === "passport"}
                                label="Copy"
                                copiedLabel="Copied"
                                ariaLabel="Copy Passport"
                                variant="subtle"
                                size="sm"
                                class="h-8 text-sm"
                                iconClass="size-3.5"
                                onCopy={() => state.copyToClipboard("passport", item().identity?.passportNumber ?? "")}
                              />
                            </>
                          }
                        />
                      </Show>

                      <Show when={item().identity?.licenseNumber}>
                        <LabeledValueRow
                          class="gap-2"
                          label="Driver's License Number"
                          labelClass="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                          value={
                            <p class="truncate font-mono text-sm text-slate-900 select-all dark:text-slate-100">
                              {item().identity?.licenseNumber}
                            </p>
                          }
                          action={
                            <CopyActionButton
                              isCopied={state.copiedField() === "license"}
                              label="Copy"
                              copiedLabel="Copied"
                              ariaLabel="Copy License"
                              variant="subtle"
                              size="sm"
                              class="h-8 text-sm"
                              iconClass="size-3.5"
                              onCopy={() => state.copyToClipboard("license", item().identity?.licenseNumber ?? "")}
                            />
                          }
                        />
                      </Show>
                    </div>
                  </Show>
                </CardWrapper>
              </Show>

              {/* Custom Fields Section */}
              <CipherCustomFieldsView fields={state.customFields} itemId={state.itemId} />

              {/* Secure Notes Section */}
              <Show when={item().notes}>
                <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div class="flex items-center justify-between">
                    <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Secure Notes</p>
                    <CopyActionButton
                      isCopied={state.copiedField() === "notes"}
                      label="Copy"
                      copiedLabel="Copied"
                      ariaLabel="Copy Notes"
                      variant="subtle"
                      size="sm"
                      class="h-8 text-sm"
                      iconClass="size-3.5"
                      onCopy={() => state.copyToClipboard("notes", item().notes ?? "")}
                    />
                  </div>
                  <pre class="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-slate-900 text-sm leading-relaxed dark:bg-slate-950 dark:text-slate-100">
                    {item().notes}
                  </pre>
                </CardWrapper>
              </Show>

              {/* Attachments Section */}
              <CipherAttachmentsSection
                item={state.item}
                onUploadAttachment={state.handleUploadAttachment}
                onDeleteAttachment={state.handleDeleteAttachment}
                readOnly={() => item().edit === false}
                canDelete={() => item().permissions?.delete !== false}
              />

              {/* Folder & Metadata Footer */}
              <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs @3xl:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Metadata & Organization</p>
                <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                  <Badge variant="subtle" class="max-w-full truncate text-sm">
                    {item().folderName ?? "No Folder"}
                  </Badge>
                  <Show when={item().organizationId}>
                    <Badge variant="outline" class="max-w-full truncate text-sm">
                      Organization: {item().organizationId}
                    </Badge>
                  </Show>
                  <Show when={item().collectionIds && item().collectionIds!.length > 0}>
                    <For each={item().collectionIds!}>
                      {(colId) => (
                        <Badge variant="filledBlue" class="max-w-full truncate text-sm">
                          {colId}
                        </Badge>
                      )}
                    </For>
                  </Show>
                </div>
                <div class="pt-2 text-sm text-slate-600 dark:text-slate-400">
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
            <CipherShareDialog
              openSignal={state.isShareDialogOpen}
              item={state.item}
              collections={state.collections}
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
