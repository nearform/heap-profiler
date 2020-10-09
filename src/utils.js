'use strict'

const { open, close } = require('fs')
const { join } = require('path')

function ensurePromiseCallback(cb) {
  if (typeof cb === 'function') {
    return [cb]
  }

  let promiseResolve, promiseReject

  const promise = new Promise((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
  })

  return [
    function(err, token) {
      if (err) {
        return promiseReject(err)
      }

      return promiseResolve(token)
    },
    promise
  ]
}

function destinationFile(ext) {
  return join(process.cwd(), `profile-${process.pid}-${Date.now()}.${ext}`)
}

function validateDestinationFile(file, cb) {
  open(file, 'w', (err, fd) => {
    if (err) {
      return cb(err)
    }

    close(fd, cb)
  })
}

module.exports = { ensurePromiseCallback, destinationFile, validateDestinationFile }
