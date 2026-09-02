import { type JSX, Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import { type VaultEntryFaviconStateProps, vaultEntryFaviconStateCreate } from "./vaultEntryFaviconStateCreate.js"

/** Fixed-size vault list favicon that keeps the category icon as loading and error fallback. */
export function VaultEntryFavicon(props: VaultEntryFaviconStateProps): JSX.Element {
  const state = vaultEntryFaviconStateCreate(props)

  return (
    <span
      class={classMerge(
        "relative mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md",
        props.class,
      )}
    >
      <Icon
        path={state.categoryIcon()}
        class={classMerge("size-full p-1.5 fill-current dark:fill-current", state.isLoaded() && "invisible")}
      />
      <Show when={state.faviconPath()} keyed>
        {(path) => {
          const image = state.faviconImage()
          if (image === null) return null

          return (
            <img
              src={path}
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              class="absolute size-4 object-contain"
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => state.markLoaded(image)}
              onError={() => state.markFailed(image)}
            />
          )
        }}
      </Show>
    </span>
  )
}
