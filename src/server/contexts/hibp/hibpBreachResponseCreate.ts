export function hibpBreachResponseCreate(value: unknown, status = 200): Response {
  const body = JSON.stringify(value)
  return new Response(body === undefined ? "null" : body, {
    headers: { "content-type": "application/json" },
    status,
  })
}
