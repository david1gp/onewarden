import type { ComponentProps } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Card surface using the extension semantic color contract. */
export function ExtensionCardWrapper(p: ComponentProps<typeof CardWrapper>) {
  return <CardWrapper {...p} class={classMerge("extension-card-surface", p.class)} />
}
