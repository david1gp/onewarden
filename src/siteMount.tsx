import { render } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import "./tailwind.css"

function HomePage() {
  return (
    <section class="mx-auto max-w-3xl px-6 py-20">
      <p class="mb-4 text-sm uppercase tracking-wide text-muted-foreground">Solid web foundation</p>
      <h1 class="text-4xl font-bold tracking-tight">onewarden-site</h1>
      <p class="mt-6 text-lg text-muted-foreground">A public Solid website built with Adaptive DS.</p>
      <Button class="mt-8" type="button">
        Get started
      </Button>
    </section>
  )
}

const root = document.getElementById("root")
if (!root) throw new Error("siteMount could not find the #root element")

render(() => <HomePage />, root)
