'use strict'

const { Session } = require('inspector')
const SonicBoom = require('sonic-boom')
const { ensurePromiseCallback, destinationFile, validateDestinationFile } = require('./utils')

const defaultDuration = 10000

module.exports = function recordAllocationTimeline(options, cb) {
  /* istanbul ignore if */
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  // Prepare the context
  const { destination, runGC, duration, signal } = Object.assign(
    { destination: destinationFile('heaptimeline'), runGC: true, duration: defaultDuration },
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

    // Trigger GC and start start tracking allocations on heap
    /* istanbul ignore else */
    if (runGC && typeof global.gc === 'function') {
      try {
        global.gc()
      } catch (e) {
        session.disconnect()
        return callback(e)
      }
    }

    // stop functon used in callback-style
    const writer = new SonicBoom({ dest: destination })
    let error = null
    let handled = false

    function onWriterEnd(err) {
      /* istanbul ignore if */
      if (handled) {
        return
      }

      handled = true
      session.disconnect()

      callback(err || error, destination)
    }

    writer.on('error', onWriterEnd)
    writer.on('close', onWriterEnd)

    // Prepare chunk appending
    session.on('HeapProfiler.addHeapSnapshotChunk', m => {
      // A write failed, discard all the rest
      /* istanbul ignore if */
      if (error) {
        return
      }

      try {
        writer.write(m.params.chunk)
      } catch (e) {
        /* istanbul ignore next */
        error = e
      }
    })

    // Stop tracking
    session.post('HeapProfiler.stopTrackingHeapObjects', err => {
      /* istanbul ignore if */
      if (err) {
        error = err
      }

      writer.end()
    })
  }

  validateDestinationFile(destination, err => {
    if (err) {
      return callback(err)
    }

    // Trigger GC and start start tracking allocations on heap
    /* istanbul ignore else */
    if (runGC && typeof global.gc === 'function') {
      try {
        global.gc()
      } catch (e) {
        return callback(e)
      }
    }

    // Start the session
    session.connect()

    session.post('HeapProfiler.startTrackingHeapObjects', { trackAllocations: true }, err => {
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
