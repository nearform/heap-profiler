'use strict'

const generateHeapSnapshot = require('./snapshot')
const generateHeapSamplingProfile = require('./profile')

let working = false

async function benchmarkGeneration(logger, type, report, options) {
  const start = process.hrtime.bigint()
  const file = await report(options)
  const end = Number(process.hrtime.bigint() - start)

  logger.info(`[@nearform/heap-profile]     Generated heap ${type} file ${file} in ${end / 1e6} ms`)
  return file
}

module.exports = function installPreloader(logger) {
  process.on('SIGUSR2', () => {
    if (working) {
      logger.info('[@nearform/heap-profile] Received SIGUSR2 but generation is already happening. Doing nothing.')
      return
    }

    working = true
    logger.info('[@nearform/heap-profile] Received SIGUSR2. Generating heap reports ...')

    const takeSnapshot = process.env.HEAP_PROFILER_SNAPSHOT !== 'false'
    const takeProfile = process.env.HEAP_PROFILER_PROFILE !== 'false'

    const snapshotOptions = {}
    const profilerOptions = {}

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

    const promises = []

    if (takeSnapshot) {
      promises.push(benchmarkGeneration(logger, 'snapshot', generateHeapSnapshot, snapshotOptions))
    }

    if (takeProfile) {
      promises.push(benchmarkGeneration(logger, 'sampling profile', generateHeapSamplingProfile, profilerOptions))
    }

    Promise.all(promises)
      .then(files => {
        logger.info('[@nearform/heap-profile] Generation completed.')
      })
      .catch(e => {
        logger.error('[@nearform/heap-profile] Generation failed.', e)
      })
      .finally(() => (working = false))
  })

  logger.info(`[@nearform/heap-profile] Listening for SIGUSR2 signal on process ${process.pid}.`)
}
