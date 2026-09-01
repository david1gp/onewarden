import type { JSX } from "solid-js"
type Meta = JSX.MetaHTMLAttributes<HTMLMetaElement>

const siteUrl = "https://onewarden.com"
const siteName = "onewarden-site"
const siteDescription = "A public Solid website built with Adaptive DS."
const ogImage = siteUrl + "/logo.svg"

function pageMeta(input: { readonly title: string; readonly description?: string; readonly path?: string }): Meta[] {
  const description = input.description ?? siteDescription
  const url = input.path ? siteUrl + input.path : siteUrl
  return [
    { title: input.title },
    { name: "description", content: description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteName },
    { property: "og:url", content: url },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: siteName + " logo" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ] as unknown as Meta[]
}

function canonicalLink(path = "/") {
  return { rel: "canonical", href: siteUrl + (path === "/" ? "" : path) }
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: siteDescription,
  }
}

function softwareSourceCodeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: siteName,
    url: siteUrl,
    description: siteDescription,
    programmingLanguage: "TypeScript",
    runtimePlatform: "Solid.js",
  }
}
export const seo = {
  siteUrl,
  siteName,
  siteDescription,
  ogImage,
  pageMeta,
  canonicalLink,
  websiteJsonLd,
  softwareSourceCodeJsonLd,
} as const
