'use strict'

const { Session } = require('inspector')
const { writeFile } = require('fs')
const { ensurePromiseCallback, destinationFile, validateDestinationFile } = require('./utils')

const defaultInterval = 32768
const defaultDuration = 10000

module.exports = function generateHeapSamplingProfile(options, cb) {
  /* istanbul ignore if */
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  // Prepare the context
  const { interval, duration, destination, signal } = Object.assign(
    { interval: defaultInterval, duration: defaultDuration, destination: destinationFile('heapprofile') },
    options
  )
  const [callback, promise] = ensurePromiseCallback(cb)
  const session = new Session()
  let timeout

  if (typeof destination !== 'string' || destination.length === 0) {
    throw new Error('The destination option must be a non empty string')
  }

  if (typeof duration !== 'number' || isNaN(duration) || duration < 0) {
    throw new Error('The duration option must be a number greater than 0')
  }

  if (typeof interval !== 'number' || isNaN(interval) || interval < 0) {
    throw new Error('The interval option must be a number greater than 0')
  }

  if (signal) {
    if (signal.addEventListener) {
      signal.addEventListener('abort', finish)
    } else {
      signal.on('abort', finish)
    }
  }

  function finish () {
    clearTimeout(timeout)
    session.post('HeapProfiler.stopSampling', (err, profile) => {
      /* istanbul ignore if */
      if (err) {
        return callback(err)
      }

      session.disconnect()

      writeFile(destination, JSON.stringify(profile.profile), 'utf-8', err => {
        /* istanbul ignore if */
        if (err) {
          return callback(err)
        }

        callback(null, destination)
      })
    })
  }

  validateDestinationFile(destination, err => {
    if (err) {
      return callback(err)
    }

    // Start the session
    session.connect()

    // Request profile
    session.post('HeapProfiler.startSampling', { samplingInterval: interval }, err => {
      /* istanbul ignore if */
      if (err) {
        return callback(err)
      }

      timeout = setTimeout(finish, duration)
    })
  })

  return promise
}
