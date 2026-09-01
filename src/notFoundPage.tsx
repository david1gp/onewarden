import { Link } from "@tanstack/solid-router"

export function NotFoundPage() {
  return (
    <section class="mx-auto max-w-3xl px-6 py-20">
      <h1 class="text-3xl font-bold">Page not found</h1>
      <p class="mt-4">The page you requested does not exist.</p>
      <Link to="/" class="mt-6 inline-block underline">
        Back home
      </Link>
    </section>
  )
}
