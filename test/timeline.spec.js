'use strict'

const t = require('tap')
const { readFileSync } = require('fs')
const { file: tmpFile } = require('tmp-promise')
const { stub } = require('sinon')

const recordAllocationTimeline = require('../src/timeline')
const validate = require('./fixtures/snapshotSchema')
const wait = require('util').promisify(setTimeout)
const duration = 10
const timeout = 5000

t.test('it correctly generates a timeline using promises', { timeout }, async t => {
  const { path: destination, cleanup } = await tmpFile()

  const stop = await recordAllocationTimeline({ destination })
  await wait(duration)
  await stop()

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  validate(generated)
  t.strictSame(validate.errors, null)
  cleanup()
})

t.test('it correctly generates a timeline using callbacks', { timeout }, async t => {
  const { path: destination, cleanup } = await tmpFile()

  return new Promise((resolve, reject) => {
    const stop = recordAllocationTimeline({ destination }, (err) => {
      if (err) {
        return reject(err)
      }
    })
    setTimeout(() => stop((err) => {
      if (err) {
        return reject(err)
      }
      try {
        const generated = JSON.parse(readFileSync(destination, 'utf-8'))
        cleanup()
        validate(generated)
        t.strictSame(validate.errors, null)
        resolve()
      } catch (e) {
        reject(e)
      }
    }), duration)
  })
})

t.test('it runs the garbage collector if requested to', { timeout }, async t => {
  const gcStub = stub(global, 'gc')

  const { path: destination, cleanup } = await tmpFile()

  const stop = await recordAllocationTimeline({ destination, runGC: true })
  await wait(duration)
  await stop()

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
    await recordAllocationTimeline({ destination, runGC: true })
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

  const stop = await recordAllocationTimeline({ destination, runGC: true })
  await wait(duration)
  try {
    await stop()
    t.fail('DID NOT THROW')
  } catch (e) {
    t.equal(e.message, 'FAILED')
  }

  t.equal(gcStub.callCount, 2)
  cleanup()

  gcStub.restore()
})

t.test('it handles file saving errors using promises', async t => {
  const stop = await recordAllocationTimeline({ destination: '/this/doesnt/exists' })
  await t.rejects(stop, {
    message: "ENOENT: no such file or directory, open '/this/doesnt/exists'"
  })
})

t.test('it handles file saving errors using callbacks', t => {
  const stop = recordAllocationTimeline({ destination: '/this/doesnt/exists' }, err => {
    t.fail(err)
  })
  stop(err => {
    t.equal(err.message, "ENOENT: no such file or directory, open '/this/doesnt/exists'")
    t.end()
  })
})

t.test('it validates the destination option', t => {
  t.throws(() => recordAllocationTimeline({ destination: 1 }), 'The destination option must be a non empty string')
  t.throws(() => recordAllocationTimeline({ destination: '' }), 'The destination option must be a non empty string')
  t.end()
})
