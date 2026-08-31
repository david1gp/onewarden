import { expect, test } from "bun:test"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { serverJobRunnerCreate } from "../../../src/server/jobs/serverJobRunner.js"
import type { ServerJobTimers } from "../../../src/server/jobs/serverJobTimers.js"

type FakeTimer = {
  callback: () => void
  delay: number
}

function fakeTimersCreate(): {
  timers: ServerJobTimers
  pending: () => FakeTimer[]
  runNext: () => () => void
} {
  let nextHandle = 0
  const entries = new Map<number, FakeTimer>()
  const timers: ServerJobTimers = {
    clearTimeout: (handle) => {
      entries.delete(handle as number)
    },
    setTimeout: (callback, delay) => {
      const handle = nextHandle++
      entries.set(handle, { callback, delay })
      return handle
    },
  }
  return {
    pending: () => [...entries.values()],
    runNext: () => {
      const entry = entries.entries().next().value as [number, FakeTimer] | undefined
      if (entry === undefined) throw new Error("No timer is pending.")
      entries.delete(entry[0])
      entry[1].callback()
      return entry[1].callback
    },
    timers,
  }
}

function loggerCreate() {
  const entries: Array<{ message: string; fields?: Readonly<Record<string, unknown>> }> = []
  return {
    entries,
    logger: {
      debug: (message: string, fields?: Readonly<Record<string, unknown>>) => entries.push({ message, fields }),
      info: (message: string, fields?: Readonly<Record<string, unknown>>) => entries.push({ message, fields }),
      warn: (message: string, fields?: Readonly<Record<string, unknown>>) => entries.push({ message, fields }),
      error: (message: string, fields?: Readonly<Record<string, unknown>>) => entries.push({ message, fields }),
    },
  }
}

function deferredCreate<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolvePromise: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: (value) => resolvePromise?.(value) }
}

async function microtasksFlush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

test("serverJobRunnerCreate runs enabled jobs immediately and reschedules each independently", async () => {
  const fakeTimers = fakeTimersCreate()
  const logs = loggerCreate()
  const runs: string[] = []
  const runner = serverJobRunnerCreate({
    jobs: [
      {
        intervalMs: 10,
        name: "fast",
        run: () => {
          runs.push("fast")
          return resultCreate(undefined)
        },
      },
      {
        intervalMs: 20,
        name: "slow",
        run: () => {
          runs.push("slow")
          return resultCreate(undefined)
        },
      },
    ],
    logger: logs.logger,
    timers: fakeTimers.timers,
  })

  runner.start()
  expect(runs).toEqual(["fast", "slow"])
  await microtasksFlush()
  expect(fakeTimers.pending().map((timer) => timer.delay)).toEqual([10, 20])

  fakeTimers.runNext()
  await microtasksFlush()
  expect(runs).toEqual(["fast", "slow", "fast"])
  expect(fakeTimers.pending().map((timer) => timer.delay)).toEqual([20, 10])
  await runner.stop()
})

test("serverJobRunnerCreate prevents overlap, recovers after failures, and disables zero intervals", async () => {
  const fakeTimers = fakeTimersCreate()
  const logs = loggerCreate()
  const deferred = deferredCreate<ReturnType<typeof resultCreate>>()
  let runs = 0
  const runner = serverJobRunnerCreate({
    jobs: [
      {
        intervalMs: 10,
        name: "recovering",
        run: () => {
          runs += 1
          if (runs === 1) return resultErrorCreate("test", "expected failure")
          return deferred.promise
        },
      },
      {
        intervalMs: 0,
        name: "disabled",
        run: () => {
          runs += 100
          return resultCreate(undefined)
        },
      },
    ],
    logger: logs.logger,
    timers: fakeTimers.timers,
  })

  runner.start()
  expect(runs).toBe(1)
  await microtasksFlush()
  expect(fakeTimers.pending().map((timer) => timer.delay)).toEqual([10])

  const timer = fakeTimers.runNext()
  timer()
  expect(runs).toBe(2)
  expect(logs.entries.some((entry) => entry.message === "job.failed")).toBe(true)

  deferred.resolve(resultCreate(undefined))
  await microtasksFlush()
  expect(fakeTimers.pending().map((entry) => entry.delay)).toEqual([10])
  expect(logs.entries.some((entry) => entry.message === "job.disabled")).toBe(true)
  await runner.stop()
})

test("serverJobRunnerCreate drains active jobs and cancels pending timers", async () => {
  const fakeTimers = fakeTimersCreate()
  const logs = loggerCreate()
  const deferred = deferredCreate<ReturnType<typeof resultCreate>>()
  const runner = serverJobRunnerCreate({
    jobs: [{ intervalMs: 10, name: "draining", run: () => deferred.promise }],
    logger: logs.logger,
    timers: fakeTimers.timers,
  })

  runner.start()
  const stopPromise = runner.stop()
  expect(fakeTimers.pending()).toHaveLength(0)
  let stopped = false
  void stopPromise.then(() => {
    stopped = true
  })
  await microtasksFlush()
  expect(stopped).toBe(false)

  deferred.resolve(resultCreate(undefined))
  await stopPromise
  expect(stopped).toBe(true)
  expect(runner.stop()).toBe(stopPromise)
  expect(logs.entries.some((entry) => entry.message === "job.stopping")).toBe(true)
  expect(logs.entries.some((entry) => entry.message === "job.drained")).toBe(true)
})

test("serverJobRunnerCreate drains a job started by a recursive timer", async () => {
  const fakeTimers = fakeTimersCreate()
  const logs = loggerCreate()
  const deferred = deferredCreate<ReturnType<typeof resultCreate>>()
  let runs = 0
  const runner = serverJobRunnerCreate({
    jobs: [
      {
        intervalMs: 10,
        name: "scheduled-draining",
        run: () => {
          runs += 1
          return runs === 1 ? resultCreate(undefined) : deferred.promise
        },
      },
    ],
    logger: logs.logger,
    timers: fakeTimers.timers,
  })

  runner.start()
  await microtasksFlush()
  fakeTimers.runNext()
  const stopPromise = runner.stop()
  let stopped = false
  void stopPromise.then(() => {
    stopped = true
  })
  await microtasksFlush()
  expect(stopped).toBe(false)

  deferred.resolve(resultCreate(undefined))
  await stopPromise
  expect(runs).toBe(2)
  expect(logs.entries.some((entry) => entry.message === "job.drained")).toBe(true)
})
