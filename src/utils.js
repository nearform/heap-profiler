'use strict'

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

module.exports = { ensurePromiseCallback, destinationFile }
