'use strict'

const generateHeapSnapshot = require('./snapshot')
const generateHeapSamplingProfile = require('./profile')
const recordAllocationTimeline = require('./timeline')

async function benchmarkGeneration(logger, type, report, options) {
  const start = process.hrtime.bigint()
  const file = await report(options)
  const end = Number(process.hrtime.bigint() - start)

  logger.info(`[@nearform/heap-profiler]     Generated heap ${type} file ${file} in ${end / 1e6} ms`)
  return file
}

module.exports = function installPreloader(logger) {
  function runTools() {
    logger.info('[@nearform/heap-profiler] Received SIGUSR2. Generating heap reports ...')

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

    if ('HEAP_PROFILER_PROFILE_DURATION' in process.env) {
      profilerOptions.duration = parseInt(process.env.HEAP_PROFILER_PROFILE_DURATION, 10)
    }

    if ('HEAP_PROFILER_TIMELINE_DESTINATION' in process.env) {
      timelineOptions.destination = process.env.HEAP_PROFILER_TIMELINE_DESTINATION
    }

    if ('HEAP_PROFILER_TIMELINE_RUN_GC' in process.env) {
      timelineOptions.runGC = process.env.HEAP_PROFILER_TIMELINE_RUN_GC === 'true'
    }

    const promises = []

    if (takeSnapshot) {
      promises.push(benchmarkGeneration(logger, 'snapshot', generateHeapSnapshot, snapshotOptions))
    }

    if (takeProfile) {
      promises.push(benchmarkGeneration(logger, 'sampling profile', generateHeapSamplingProfile, profilerOptions))
    }

    if (recordTimeline) {
      promises.push(benchmarkGeneration(logger, 'allocation timeline', async options => {
        const stop = await recordAllocationTimeline(options)
        logger.info('[@nearform/heap-profiler] Allocation timeline started. Awaiting SIGUSR2 to stop ...')
        return new Promise((resolve, reject) => process.once('SIGUSR2', () => stop().then(resolve).catch(reject)))
      }, timelineOptions))
    }

    Promise.all(promises)
      .then(() => {
        logger.info('[@nearform/heap-profiler] Generation completed.')
        // resume awaiting on the next start signal
        process.once('SIGUSR2', runTools)
      })
      .catch(e => {
        logger.error('[@nearform/heap-profiler] Generation failed.', e)
        // stops itslef
        process.kill(process.pid, 'SIGUSR2')
      })
  }

  process.once('SIGUSR2', runTools)
  logger.info(`[@nearform/heap-profiler] Listening for SIGUSR2 signal on process ${process.pid}.`)
}
