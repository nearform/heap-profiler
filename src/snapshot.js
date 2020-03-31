'use strict'

const { Session } = require('inspector')
const { openSync, closeSync, writeSync } = require('fs')
const { ensurePromiseCallback, destinationFile } = require('./utils')

module.exports = function generateHeapSnapshot(cb) {
  // Prepare the context
  const [callback, promise] = ensurePromiseCallback(cb)
  const destination = destinationFile('heapsnapshot')
  const session = new Session()
  let fd
  let writeError

  // Open the destination file
  try {
    fd = openSync(destination, 'w')
  } catch (e) {
    return callback(e)
  }

  // Start the session
  session.connect()

  // Prepare chunk appending
  session.on('HeapProfiler.addHeapSnapshotChunk', m => {
    // A write failed, discard all the rest
    if (writeError) {
      return
    }

    try {
      writeSync(fd, m.params.chunk)
    } catch (e) {
      writeError = e
    }
  })

  // Request heap snapshot
  session.post('HeapProfiler.takeHeapSnapshot', null, (err, r) => {
    if (writeError || err) {
      return callback(writeError || err)
    }

    // Cleanup
    session.disconnect()

    try {
      closeSync(fd)
    } catch (e) {
      // No-op
    }

    callback(null, destination)
  })

  return promise
}
