import * as v from "valibot"

const emailSchema = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email())

/** Validates and resolves an optional user-entered email into an SSO domain hint. */
export function webSsoDomainHintResolve(input: string | null | undefined): string | undefined {
  if (input === null || input === undefined) return undefined
  const trimmed = input.trim()
  if (trimmed.length === 0) return undefined
  const parsed = v.safeParse(emailSchema, trimmed)
  if (!parsed.success) return undefined
  return parsed.output
}
