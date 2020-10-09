'use strict'

const { Session } = require('inspector')
const SonicBoom = require('sonic-boom')
const { ensurePromiseCallback, destinationFile, validateDestinationFile } = require('./utils')

module.exports = function recordAllocationTimeline(options, cb) {
  /* istanbul ignore if */
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  // Prepare the context
  const [startCb, startPromise] = ensurePromiseCallback(cb)
  const { destination, runGC } = Object.assign({ destination: destinationFile('heaptimeline'), runGC: true }, options)
  const session = new Session()

  if (typeof destination !== 'string' || destination.length === 0) {
    throw new Error('The destination option must be a non empty string')
  }

  function handleStop(stopCb) {
    // Trigger GC and start start tracking allocations on heap
    /* istanbul ignore else */
    if (runGC && typeof global.gc === 'function') {
      try {
        global.gc()
      } catch (e) {
        session.disconnect()
        return stopCb(e)
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

      stopCb(err || error, destination)
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
      return startCb(err)
    }

    // Trigger GC and start start tracking allocations on heap
    /* istanbul ignore else */
    if (runGC && typeof global.gc === 'function') {
      try {
        global.gc()
      } catch (e) {
        return startCb(e)
      }
    }

    // Start the session
    session.connect()

    session.post('HeapProfiler.startTrackingHeapObjects', { trackAllocations: true }, err => {
      /* istanbul ignore if */
      if (err) {
        return startCb(err)
      }

      if (startPromise) {
        // When using promise-style, we need to wrap handleStop in a promise
        startCb(null, function() {
          return new Promise(function(resolve, reject) {
            handleStop(err => {
              err ? reject(err) : resolve()
            })
          })
        })
      }
    })
  })

  // When using callback-style, startPromise will be undefined
  return startPromise || handleStop
}
