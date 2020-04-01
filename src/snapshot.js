'use strict'

const { Session } = require('inspector')
const SonicBoom = require('sonic-boom')
const { ensurePromiseCallback, destinationFile } = require('./utils')

module.exports = function generateHeapSnapshot(options, cb) {
  /* istanbul ignore if */
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  // Prepare the context
  const [callback, promise] = ensurePromiseCallback(cb)
  const { destination } = Object.assign({ destination: destinationFile('heapsnapshot') }, options)
  const session = new Session()
  let error = null
  let handled = false

  if (typeof destination !== 'string' || destination.length === 0) {
    throw new Error('The destination option must be a non empty string')
  }

  const writer = new SonicBoom({ dest: destination })

  writer.on('error', err => {
    /* istanbul ignore if */
    if (handled) {
      return
    }

    handled = true
    callback(err)
  })

  writer.on('close', () => {
    /* istanbul ignore if */
    if (handled) {
      return
    }

    handled = true
    callback(error, destination)
  })

  // Start the session
  session.connect()

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

  // Request heap snapshot
  session.post('HeapProfiler.takeHeapSnapshot', null, (err, r) => {
    /* istanbul ignore next */
    if (err && !error) {
      error = err
    }

    // Cleanup
    session.disconnect()
    writer.end()
  })

  return promise
}
