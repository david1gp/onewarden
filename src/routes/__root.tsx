import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { HydrationScript } from "solid-js/web"
import { seo } from "../lib/seo.js"
import appCss from "../tailwind.css?url"
import { NotFoundPage } from "../notFoundPage.js"

const siteName = "onewarden-site"
const speculationRules = JSON.stringify({
  prerender: [{ where: { href_matches: "/*" }, eagerness: "moderate" }],
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#ffffff" },
      ...seo.pageMeta({ title: siteName, path: "/" }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "any" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(seo.websiteJsonLd()) },
      { type: "application/ld+json", children: JSON.stringify(seo.softwareSourceCodeJsonLd()) },
    ],
  }),
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HydrationScript />
        <script type="speculationrules" innerHTML={speculationRules} />
        <HeadContent />
      </head>
      <body class="min-h-dvh">
        <header class="border-b p-4">
          <Link to="/" class="font-semibold">
            {siteName}
          </Link>
        </header>
        <main>
          <Suspense>{props.children}</Suspense>
        </main>
        <footer class="border-t p-4 text-sm">
          <nav aria-label="Legal">
            <Link to="/impressum" class="mr-4 underline">
              Impressum
            </Link>
            <Link to="/agb" class="underline">
              AGB
            </Link>
          </nav>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
