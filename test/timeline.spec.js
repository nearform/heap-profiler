'use strict'

const t = require('tap')
const { readFileSync } = require('fs')
const { file: tmpFile } = require('tmp-promise')
const AbortController = require('abort-controller')
const EventEmitter = require('events')

const { stub } = require('sinon')

const recordAllocationTimeline = require('../src/timeline')
const allocateMemoryFor = require('./allocator')
const validate = require('./fixtures/snapshotSchema')

t.test('it correctly generates a timeline using promises', async t => {
  const { path: destination, cleanup } = await tmpFile()

  const timelinePromise = recordAllocationTimeline({ destination, duration: 100 })
  await allocateMemoryFor(100)
  await timelinePromise

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.true(validate(generated))
  t.strictSame(validate.errors, null)
  cleanup()
})

t.test('it correctly generates a timeline using callbacks', async t => {
  const { path: destination, cleanup } = await tmpFile()

  const test = new Promise((resolve, reject) => {
    recordAllocationTimeline({ destination, duration: 100 }, () => {
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
  await t.rejects(recordAllocationTimeline({ destination: '/this/doesnt/exists' }), {
    message: "ENOENT: no such file or directory, open '/this/doesnt/exists'"
  })
})

t.test('it handles file saving errors using callbacks', t => {
  recordAllocationTimeline({ destination: '/this/doesnt/exists' }, err => {
    t.equal(err.message, "ENOENT: no such file or directory, open '/this/doesnt/exists'")
    t.end()
  })
})

t.test('it runs the garbage collector if requested to', async t => {
  const gcStub = stub(global, 'gc')

  const { path: destination, cleanup } = await tmpFile()

  const timelinePromise = recordAllocationTimeline({ destination, runGC: true, duration: 100 })
  await allocateMemoryFor(100)
  await timelinePromise

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  validate(generated)
  t.strictSame(validate.errors, null)
  t.equal(gcStub.callCount, 2)
  cleanup()

  gcStub.restore()
})

t.test('it handles garbage collector error before recording', async t => {
  const gcStub = stub(global, 'gc')
  gcStub.onFirstCall().throws(new Error('FAILED'))
  const { path: destination, cleanup } = await tmpFile()

  try {
    await recordAllocationTimeline({ destination, runGC: true, duration: 100 })

    t.fail('DID NOT THROW')
  } catch (e) {
    t.equal(e.message, 'FAILED')
  }

  t.equal(gcStub.callCount, 1)
  cleanup()

  gcStub.restore()
})

t.test('it handles garbage collector error when stopping recording', async t => {
  const gcStub = stub(global, 'gc')
  gcStub.onSecondCall().throws(new Error('FAILED'))
  const { path: destination, cleanup } = await tmpFile()

  try {
    await recordAllocationTimeline({ destination, runGC: true, duration: 100 })

    t.fail('DID NOT THROW')
  } catch (e) {
    t.equal(e.message, 'FAILED')
  }

  t.equal(gcStub.callCount, 2)
  cleanup()

  gcStub.restore()
})

t.test('it can use an AbortController', async t => {
  const { path: destination, cleanup } = await tmpFile()
  const controller = new AbortController()

  const start = Date.now()

  setTimeout(function() {
    controller.abort()
  }, 100)

  const timelinePromise = recordAllocationTimeline({ destination, signal: controller.signal })
  await allocateMemoryFor(100)
  await timelinePromise

  const end = Date.now()
  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.is(end - start < 5000, true)
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

  const timelinePromise = recordAllocationTimeline({ destination, signal: controller })
  await allocateMemoryFor(100)
  await timelinePromise

  const end = Date.now()
  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.is(end - start < 5000, true)
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

  const timelinePromise = recordAllocationTimeline({ destination, signal: controller.signal, duration: 100 })
  await allocateMemoryFor(100)
  await timelinePromise

  const end = Date.now()
  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.is(end - start < 5000, true)
  t.is(end - start >= 200, true)

  t.true(validate(generated))

  cleanup()
})

t.test('it validates the destination option', t => {
  t.plan(2)

  recordAllocationTimeline({ destination: '' }, err => {
    t.is(err.message, 'The destination option must be a non empty string')
  })

  recordAllocationTimeline({ destination: -1 }, err => {
    t.is(err.message, 'The destination option must be a non empty string')
  })
})

t.test('it validates the duration option', t => {
  t.plan(2)

  recordAllocationTimeline({ duration: '' }, err => {
    t.is(err.message, 'The duration option must be a number greater than 0')
  })

  recordAllocationTimeline({ duration: -1 }, err => {
    t.is(err.message, 'The duration option must be a number greater than 0')
  })
})

t.test('it validates the signal option', t => {
  const controller = new AbortController()
  controller.abort()

  recordAllocationTimeline({ signal: controller.signal }, err => {
    t.is(err.message, 'The AbortController has already been aborted')
    t.end()
  })
})
