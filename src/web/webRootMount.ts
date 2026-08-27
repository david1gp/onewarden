import { createComponent } from "solid-js"
import { render } from "solid-js/web"
import { OneWardenWelcomePage } from "./OneWardenWelcomePage"

export function webRootMount(container: HTMLElement | null): void {
  if (!container) throw new Error("The OneWarden web root element was not found.")

  render(() => createComponent(OneWardenWelcomePage, {}), container)
}
