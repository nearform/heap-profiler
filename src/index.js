'use strict'

const generateHeapSnapshot = require('./snapshot')
const generateHeapSamplingProfile = require('./profile')

module.exports = { generateHeapSnapshot, generateHeapSamplingProfile }

if (require.main === undefined) {
  let logger = console

  if (process.env.HEAP_PROFILER_LOGGING_DISABLED === 'true') {
    logger = { info: () => {}, error: () => {} }
  }

  require('./preloader')(logger)
}
