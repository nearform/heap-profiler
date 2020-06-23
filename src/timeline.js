'use strict'

const { Session } = require('inspector')
const SonicBoom = require('sonic-boom')
const { ensurePromiseCallback, destinationFile } = require('./utils')

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
    // stop functon used in callback-style
    const writer = new SonicBoom({ dest: destination })
    let error = null
    let handled = false

    writer.on('error', err => {
      /* istanbul ignore if */
      if (handled) {
        return
      }
      handled = true
      session.disconnect()
      stopCb(err)
    })

    writer.on('close', () => {
      /* istanbul ignore if */
      if (handled) {
        return
      }
      handled = true
      session.disconnect()
      stopCb(error, destination)
    })

    try {
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
      if (runGC && typeof global.gc === 'function') {
        global.gc()
      }
      session.post('HeapProfiler.stopTrackingHeapObjects', null, err => {
        /* istanbul ignore if */
        if (err) {
          error = err
        }
        writer.end()
      })
    } catch (err) {
      error = err
      writer.end()
    }
  }
  // Start the session
  session.connect()
  // Trigger GC and start start tracking allocations on heap
  if (runGC && typeof global.gc === 'function') {
    global.gc()
  }
  session.post('HeapProfiler.startTrackingHeapObjects', { trackAllocations: true }, err => {
    /* istanbul ignore if */
    if (err) {
      return startCb(err)
    }
    if (startPromise) {
      // when using promise-style, we need to wrap handleStop in a promise
      startCb(null, function() {
        return new Promise(function(resolve, reject) {
          handleStop(err => {
            err ? reject(err) : resolve()
          })
        })
      })
    }
  })

  // when using callback-style, startPromise will be undefined
  return startPromise || handleStop
}
