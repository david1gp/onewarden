import { createFileRoute } from "@tanstack/solid-router"
import markdownCss from "../markdown.css?url"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"

export const Route = createFileRoute("/agb")({
  loader: () => legal.markdownHtmlGet("agb"),
  head: () => ({
    meta: seo.pageMeta({ title: "AGB", path: "/agb" }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/agb").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: AgbPage,
})

function AgbPage() {
  const html = Route.useLoaderData()
  return <article class="markdown-body mx-auto max-w-3xl px-6 py-12" innerHTML={html()} />
}
