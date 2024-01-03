'use strict'

const { Session } = require('inspector')
const { writeFileSync } = require('fs')
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
    callback(new Error('The destination option must be a non empty string'))
    return
  }

  if (typeof duration !== 'number' || isNaN(duration) || duration < 0) {
    callback(new Error('The duration option must be a number greater than 0'))
    return
  }

  if (typeof interval !== 'number' || isNaN(interval) || interval < 0) {
    callback(new Error('The interval option must be a number greater than 0'))
    return
  }

  if (signal) {
    if (signal.aborted) {
      callback(new Error('The AbortController has already been aborted'))
      return
    }

    if (signal.addEventListener) {
      signal.addEventListener('abort', finish)
    } else {
      signal.once('abort', finish)
    }
  }

  function finish() {
    clearTimeout(timeout)
    session.post('HeapProfiler.stopSampling', (err, profile) => {
      /* istanbul ignore if */
      if (err) {
        return callback(err)
      }

      session.disconnect()

      try {
        writeFileSync(destination, JSON.stringify(profile.profile), 'utf-8')
        callback(null, destination)
      } catch (err) {
        callback(err)
      }
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

      if (!signal) {
        timeout = setTimeout(finish, duration)
      }
    })
  })

  return promise
}
