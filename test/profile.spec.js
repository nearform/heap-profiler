'use strict'

const t = require('tap')
const { readFileSync } = require('fs')
const { file: tmpFile } = require('tmp-promise')
const AbortController = require('abort-controller')
const EventEmitter = require('events')

const generateHeapSamplingProfile = require('../src/profile')
const allocateMemoryFor = require('./allocator')
const validate = require('./fixtures/profileSchema')

t.test('it correctly generates a profile using promises', async t => {
  const { path: destination, cleanup } = await tmpFile()

  const samplingPromise = generateHeapSamplingProfile({ destination, duration: 100 })
  await allocateMemoryFor(100)
  await samplingPromise

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.true(validate(generated))
  t.strictSame(validate.errors, null)

  cleanup()
})

t.test('it correctly generates a profile using callbacks', async t => {
  const { path: destination, cleanup } = await tmpFile()

  const test = new Promise((resolve, reject) => {
    generateHeapSamplingProfile({ destination, duration: 100 }, () => {
      try {
        const generated = JSON.parse(readFileSync(destination, 'utf-8'))
        cleanup()

        t.true(validate(generated))
        t.strictSame(validate.errors, null)

        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  await allocateMemoryFor(100)

  return test
})

t.test('it handles file saving errors using promises', async t => {
  await t.rejects(() => generateHeapSamplingProfile({ duration: 10, destination: '/this/doesnt/exists' }), {
    message: "ENOENT: no such file or directory, open '/this/doesnt/exists'"
  })
})

t.test('it handles file saving errors using callbacks', t => {
  generateHeapSamplingProfile({ duration: 10, destination: '/this/doesnt/exists' }, err => {
    t.equal(err.message, "ENOENT: no such file or directory, open '/this/doesnt/exists'")
    t.end()
  })
})

t.test('it can use an AbortController', async t => {
  const { path: destination, cleanup } = await tmpFile()
  const controller = new AbortController()

  const start = Date.now()

  setTimeout(function() {
    controller.abort()
  }, 100)

  const samplingPromise = generateHeapSamplingProfile({ destination, signal: controller.signal })
  await allocateMemoryFor(100)
  await samplingPromise

  const end = Date.now()
  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.is(end - start < 1000, true)
  t.is(end - start >= 100, true)

  t.true(validate(generated))

  cleanup()
})

t.test('it can use an EventEmitter as AbortController', async t => {
  const { path: destination, cleanup } = await tmpFile()
  const controller = new EventEmitter()

  const start = Date.now()

  setTimeout(function() {
    controller.emit('abort')
  }, 100)

  const samplingPromise = generateHeapSamplingProfile({ destination, signal: controller })
  await allocateMemoryFor(100)
  await samplingPromise

  const end = Date.now()
  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.is(end - start < 1000, true)
  t.is(end - start >= 100, true)

  t.true(validate(generated))

  cleanup()
})

t.test('it ignores duration when using an AbortController', async t => {
  const { path: destination, cleanup } = await tmpFile()
  const controller = new AbortController()

  const start = Date.now()

  setTimeout(function() {
    controller.abort()
  }, 200)

  const samplingPromise = generateHeapSamplingProfile({ destination, signal: controller.signal, duration: 100 })
  await allocateMemoryFor(100)
  await samplingPromise

  const end = Date.now()
  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.is(end - start < 1000, true)
  t.is(end - start >= 200, true)

  t.true(validate(generated))

  cleanup()
})

t.test('it validates the destination option', t => {
  t.plan(2)

  generateHeapSamplingProfile({ destination: '' }, err => {
    t.is(err.message, 'The destination option must be a non empty string')
  })

  generateHeapSamplingProfile({ destination: -1 }, err => {
    t.is(err.message, 'The destination option must be a non empty string')
  })
})

t.test('it validates the duration option', t => {
  t.plan(2)

  generateHeapSamplingProfile({ duration: '' }, err => {
    t.is(err.message, 'The duration option must be a number greater than 0')
  })

  generateHeapSamplingProfile({ duration: -1 }, err => {
    t.is(err.message, 'The duration option must be a number greater than 0')
  })
})

t.test('it validates the interval option', t => {
  t.plan(2)

  generateHeapSamplingProfile({ interval: '' }, err => {
    t.is(err.message, 'The interval option must be a number greater than 0')
  })

  generateHeapSamplingProfile({ interval: -1 }, err => {
    t.is(err.message, 'The interval option must be a number greater than 0')
  })
})

t.test('it validates the signal option', t => {
  const controller = new AbortController()
  controller.abort()

  generateHeapSamplingProfile({ signal: controller.signal }, err => {
    t.is(err.message, 'The AbortController has already been aborted')
    t.end()
  })
})
