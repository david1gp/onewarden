import { createFileRoute } from "@tanstack/solid-router"
import markdownCss from "../markdown.css?url"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"

export const Route = createFileRoute("/impressum")({
  loader: () => legal.markdownHtmlGet("impressum"),
  head: () => ({
    meta: seo.pageMeta({ title: "Impressum", path: "/impressum" }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/impressum").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: ImpressumPage,
})

function ImpressumPage() {
  const html = Route.useLoaderData()
  return <article class="markdown-body mx-auto max-w-3xl px-6 py-12" innerHTML={html()} />
}
