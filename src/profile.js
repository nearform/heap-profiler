'use strict'

const { Session } = require('inspector')
const { openSync, closeSync, writeSync } = require('fs')
const { ensurePromiseCallback, destinationFile } = require('./utils')

const defaultInterval = 32768
const defaultDuration = 10000

module.exports = function generateHeapSamplingProfile(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  // Prepare the context
  const { interval, duration } = Object.assign({ interval: defaultInterval, duration: defaultDuration }, options || {})
  const [callback, promise] = ensurePromiseCallback(cb)
  const destination = destinationFile('heapsnapshot')
  const session = new Session()
  let fd

  if (typeof duration !== 'number' || isNaN(duration) || duration < 0) {
    throw new Error('The duration option must be a number greater than 0')
  }

  if (typeof interval !== 'number' || isNaN(interval) || interval < 0) {
    throw new Error('The interval option must be a number greater than 0')
  }

  // Open the destination file
  try {
    fd = openSync(destination, 'w')
  } catch (e) {
    return callback(e)
  }

  // Start the session
  session.connect()

  // Request profile
  session.post('HeapProfiler.startSampling', interval, err => {
    if (err) {
      return callback(err)
    }

    setTimeout(() => {
      session.post('HeapProfiler.stopSampling', (err, profile) => {
        if (err) {
          return callback(err)
        }

        // Write file
        let writeError

        try {
          writeSync(fd, JSON.stringify(profile.profile))
        } catch (err) {
          writeError = err
        }

        // Cleanup
        session.disconnect()

        try {
          closeSync(fd)
        } catch (e) {
          // No-op
        }

        callback(writeError, destination)
      })
    }, duration)
  })

  return promise
}
