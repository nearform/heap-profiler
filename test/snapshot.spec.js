'use strict'

const t = require('tap')
const { readFileSync } = require('fs')
const { file: tmpFile } = require('tmp-promise')
const { stub } = require('sinon')

const generateHeapSnapshot = require('../src/snapshot')
const validate = require('./fixtures/snapshotSchema')

t.test('it correctly generates a snapshot using promises', async t => {
  const { path: destination, cleanup } = await tmpFile()

  await generateHeapSnapshot({ destination })

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.true(validate(generated))

  cleanup()
})

t.test('it correctly generates a snapshot using callbacks', async t => {
  const { path: destination, cleanup } = await tmpFile()

  return new Promise((resolve, reject) => {
    generateHeapSnapshot({ destination }, () => {
      try {
        const generated = JSON.parse(readFileSync(destination, 'utf-8'))
        cleanup()

        t.true(validate(generated))
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })
})

t.test('it runs the garbage collector if requested to', async t => {
  const gcStub = stub(global, 'gc')

  const { path: destination, cleanup } = await tmpFile()

  await generateHeapSnapshot({ destination, runGC: true })

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.true(validate(generated))
  t.equal(gcStub.callCount, 1)
  cleanup()

  gcStub.restore()
})

t.test('it handles garbage collector errors', async t => {
  const gcStub = stub(global, 'gc')
  gcStub.onFirstCall().throws(new Error('FAILED'))
  const { path: destination, cleanup } = await tmpFile()

  try {
    await generateHeapSnapshot({ destination, runGC: true })
    t.fail('DID NOT THROW')
  } catch (e) {
    t.equal(e.message, 'FAILED')
  }

  t.equal(gcStub.callCount, 1)
  cleanup()

  gcStub.restore()
})

t.test('it handles file saving errors using promises', async t => {
  await t.rejects(() => generateHeapSnapshot({ destination: '/this/doesnt/exists' }), {
    message: "ENOENT: no such file or directory, open '/this/doesnt/exists'"
  })
})

t.test('it handles file saving errors using callbacks', t => {
  generateHeapSnapshot({ destination: '/this/doesnt/exists' }, err => {
    t.equal(err.message, "ENOENT: no such file or directory, open '/this/doesnt/exists'")
    t.end()
  })
})

t.test('it validates the destination option', t => {
  t.throws(() => generateHeapSnapshot({ destination: 1 }), 'The destination option must be a non empty string')
  t.throws(() => generateHeapSnapshot({ destination: '' }), 'The destination option must be a non empty string')
  t.end()
})
