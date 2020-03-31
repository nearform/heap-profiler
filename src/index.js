'use strict'

const generateHeapSnapshot = require('./snapshot')
const generateHeapSamplingProfile = require('./profile')

module.exports = { generateHeapSnapshot, generateHeapSamplingProfile }

if (require.main === undefined) {
  require('./preloader')
}
