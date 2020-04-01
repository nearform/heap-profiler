'use strict'

const t = require('tap')
const { readFileSync } = require('fs')
const { file: tmpFile } = require('tmp-promise')

const generateHeapSnapshot = require('../src/snapshot')
const validate = require('./fixtures/snapshotSchema')

t.test('it correctly generates a snapshot using promises', async t => {
  const { path: destination, cleanup } = await tmpFile()

  await generateHeapSnapshot({ destination })

  const generated = JSON.parse(readFileSync(destination, 'utf-8'))

  t.true(validate(generated))

  cleanup()
})

t.test('it correctly generates a snapshot using callbacks', t => {
  tmpFile().then(({ path: destination, cleanup }) => {
    generateHeapSnapshot({ destination }, () => {
      const generated = JSON.parse(readFileSync(destination, 'utf-8'))
      cleanup()

      t.true(validate(generated))
      t.end()
    })
  })
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
