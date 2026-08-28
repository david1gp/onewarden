import type { MiddlewareHandler } from "hono"
import type { Clock } from "../shared/clock/clock.js"
import { clockCreate } from "../shared/clock/clockCreate.js"
import type { Identifier } from "../shared/identifier/identifier.js"
import { identifierCreate } from "../shared/identifier/identifierCreate.js"
import type { Logger } from "../shared/logging/logger.js"
import { loggerCreate } from "../shared/logging/loggerCreate.js"

function requestLoggingRequestIdRead(value: string | undefined): string | undefined {
  if (value === undefined || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) return undefined
  return value
}

export function requestLoggingMiddleware(options?: {
  clock?: Clock
  identifier?: Identifier
  logger?: Logger
}): MiddlewareHandler {
  const clock = options?.clock ?? clockCreate()
  const identifier = options?.identifier ?? identifierCreate()
  const logger = options?.logger ?? loggerCreate({ clock })

  return async (context, next) => {
    const requestId = requestLoggingRequestIdRead(context.req.header("x-request-id")) ?? identifier.uuid()
    const startedAt = clock.now()
    context.set("requestId", requestId)
    context.header("x-request-id", requestId)
    logger.info("request.started", {
      method: context.req.method,
      path: context.req.path,
      requestId,
    })

    await next()

    const durationMs = Math.max(0, clock.now().getTime() - startedAt.getTime())
    context.res.headers.set("x-request-id", requestId)
    logger.info("request.completed", {
      durationMs,
      method: context.req.method,
      path: context.req.path,
      requestId,
      status: context.res.status,
    })
  }
}
