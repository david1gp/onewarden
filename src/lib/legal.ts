import { marked } from "marked"

const markdownLoaders = import.meta.glob<string>("/src/legal/*.md", { query: "?raw", import: "default" })

async function markdownHtmlGet(name: "agb" | "impressum"): Promise<string> {
  const loader = markdownLoaders["/src/legal/" + name + ".md"]
  if (loader === undefined) return "<p>Content unavailable.</p>"
  const raw = await loader()
  const content = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "")
  return marked.parse(content, { async: false })
}

export const legal = { markdownHtmlGet } as const
