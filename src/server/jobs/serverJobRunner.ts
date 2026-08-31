import type { Logger } from "../../shared/logging/logger.js"
import type { ServerJob } from "./serverJob.js"
import type { ServerJobTimers } from "./serverJobTimers.js"

type ServerJobState = {
  job: ServerJob
  running: boolean
  timeout: number | undefined
}

export function serverJobRunnerCreate(options: {
  jobs: readonly ServerJob[]
  logger: Logger
  timers?: ServerJobTimers
}): { start: () => void; stop: () => Promise<void> } {
  const timers: ServerJobTimers = options.timers ?? {
    clearTimeout: (handle) => clearTimeout(handle),
    setTimeout: (callback, delay) => setTimeout(callback, delay) as unknown as number,
  }
  const states = options.jobs.map((job): ServerJobState => ({ job, running: false, timeout: undefined }))
  const activeRuns = new Set<Promise<void>>()
  let started = false
  let stopping = false
  let stopPromise: Promise<void> | undefined

  const schedule = (state: ServerJobState): void => {
    if (stopping || state.running || state.timeout !== undefined || state.job.intervalMs <= 0) return
    try {
      state.timeout = timers.setTimeout(() => {
        state.timeout = undefined
        track(state)
      }, state.job.intervalMs)
    } catch {
      options.logger.error("job.schedule-failed", { name: state.job.name, errorMessage: "Job could not be scheduled." })
    }
  }

  const execute = async (state: ServerJobState): Promise<void> => {
    if (stopping || state.running) return
    state.running = true
    options.logger.debug("job.started", { name: state.job.name })
    try {
      const result = await state.job.run()
      if (!result.success) {
        options.logger.error("job.failed", { name: state.job.name, errorMessage: result.errorMessage })
        return
      }
      options.logger.debug("job.completed", { name: state.job.name })
    } catch {
      options.logger.error("job.failed", { name: state.job.name, errorMessage: "Job execution failed." })
    } finally {
      state.running = false
      schedule(state)
    }
  }

  const track = (state: ServerJobState): void => {
    const run = execute(state)
    activeRuns.add(run)
    void run.then(
      () => activeRuns.delete(run),
      () => activeRuns.delete(run),
    )
  }

  const start = (): void => {
    if (started || stopping) return
    started = true
    for (const state of states) {
      if (state.job.intervalMs <= 0) {
        options.logger.info("job.disabled", { name: state.job.name })
        continue
      }
      track(state)
    }
  }

  const stop = (): Promise<void> => {
    if (stopPromise !== undefined) return stopPromise
    stopping = true
    for (const state of states) {
      if (state.timeout !== undefined) {
        timers.clearTimeout(state.timeout)
        state.timeout = undefined
      }
      if (state.running) options.logger.debug("job.stopping", { name: state.job.name })
    }
    stopPromise = Promise.all([...activeRuns]).then(() => {
      for (const state of states) {
        if (!started || state.job.intervalMs <= 0 || state.running) continue
        options.logger.debug("job.drained", { name: state.job.name })
      }
    })
    return stopPromise
  }

  return { start, stop }
}
