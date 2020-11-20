'use strict'

const generateHeapSnapshot = require('./snapshot')
const generateHeapSamplingProfile = require('./profile')
const recordAllocationTimeline = require('./timeline')
const AbortController = require('abort-controller')

function benchmarkGeneration(logger, type, report, options, cb) {
  const start = process.hrtime.bigint()

  report(options, (err, file) => {
    if (err) {
      logger.error(`[@nearform/heap-profiler]     Heap ${type} generation failed`, err)
      return cb(err)
    }

    const end = Number(process.hrtime.bigint() - start)
    logger.info(`[@nearform/heap-profiler]     Generated heap ${type} file ${file} in ${end / 1e6} ms`)
    cb(file)
  })
}

module.exports = function installPreloader(logger) {
  function runTools() {
    logger.info('[@nearform/heap-profiler] Received SIGUSR2. Starting tools ...')

    const takeSnapshot = process.env.HEAP_PROFILER_SNAPSHOT !== 'false'
    const takeProfile = process.env.HEAP_PROFILER_PROFILE !== 'false'
    const recordTimeline = process.env.HEAP_PROFILER_TIMELINE !== 'false'

    const snapshotOptions = {}
    const profilerOptions = {}
    const timelineOptions = {}

    if ('HEAP_PROFILER_SNAPSHOT_DESTINATION' in process.env) {
      snapshotOptions.destination = process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION
    }

    if ('HEAP_PROFILER_SNAPSHOT_RUN_GC' in process.env) {
      profilerOptions.runGC = process.env.HEAP_PROFILER_SNAPSHOT_RUN_GC === 'true'
    }

    if ('HEAP_PROFILER_PROFILE_DESTINATION' in process.env) {
      profilerOptions.destination = process.env.HEAP_PROFILER_PROFILE_DESTINATION
    }

    if ('HEAP_PROFILER_PROFILE_INTERVAL' in process.env) {
      profilerOptions.interval = parseInt(process.env.HEAP_PROFILER_PROFILE_INTERVAL, 10)
    }

    if ('HEAP_PROFILER_TIMELINE_DESTINATION' in process.env) {
      timelineOptions.destination = process.env.HEAP_PROFILER_TIMELINE_DESTINATION
    }

    if ('HEAP_PROFILER_TIMELINE_RUN_GC' in process.env) {
      timelineOptions.runGC = process.env.HEAP_PROFILER_TIMELINE_RUN_GC === 'true'
    }

    let toInvoke = takeSnapshot + takeProfile + recordTimeline

    function onToolEnd() {
      toInvoke--

      if (toInvoke > 0) {
        return
      }

      logger.info('[@nearform/heap-profiler] All tools have completed.')

      // Resume awaiting on the next start signal
      process.once('SIGUSR2', runTools)
    }

    if (toInvoke === 0) {
      logger.info('[@nearform/heap-profiler] All tools were disabled.')

      // Resume awaiting on the next start signal
      process.once('SIGUSR2', runTools)

      return
    }

    if (takeSnapshot) {
      benchmarkGeneration(logger, 'snapshot', generateHeapSnapshot, snapshotOptions, onToolEnd)
    }

    if (takeProfile) {
      const controller = new AbortController()
      profilerOptions.signal = controller.signal
      const abort = controller.abort.bind(controller)
      process.once('SIGUSR2', abort)

      logger.info('[@nearform/heap-profiler] Sampling profiler started. Awaiting SIGUSR2 to stop ...')
      benchmarkGeneration(logger, 'sampling profile', generateHeapSamplingProfile, profilerOptions, function(err) {
        process.removeListener('SIGUSR2', abort)
        onToolEnd(err)
      })
    }

    if (recordTimeline) {
      benchmarkGeneration(
        logger,
        'allocation timeline',
        (options, cb) => {
          const stop = recordAllocationTimeline(options, cb)
          logger.info('[@nearform/heap-profiler] Allocation timeline started. Awaiting SIGUSR2 to stop ...')
          process.once('SIGUSR2', () => stop(cb))
        },
        timelineOptions,
        onToolEnd
      )
    }
  }

  process.once('SIGUSR2', runTools)
  logger.info(`[@nearform/heap-profiler] Listening for SIGUSR2 signal on process ${process.pid}.`)
}
