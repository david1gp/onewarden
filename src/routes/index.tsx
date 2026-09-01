import { createFileRoute } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { seo } from "../lib/seo.js"

const siteName = "onewarden-site"
const description = "A public Solid website built with Adaptive DS."

export const Route = createFileRoute("/")({
  head: () => ({
    meta: seo.pageMeta({ title: siteName, description, path: "/" }),
    links: [seo.canonicalLink("/")],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <section class="mx-auto max-w-3xl px-6 py-20">
      <p class="mb-4 text-sm uppercase tracking-wide text-muted-foreground">Solid web foundation</p>
      <h1 class="text-4xl font-bold tracking-tight">{siteName}</h1>
      <p class="mt-6 text-lg text-muted-foreground">{description}</p>
      <Button class="mt-8" type="button">
        Get started
      </Button>
    </section>
  )
}
