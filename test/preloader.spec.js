'use strict'

const { unlinkSync, readFileSync, statSync } = require('fs')
const t = require('tap')
const { spy } = require('sinon')
const { tmpName } = require('tmp-promise')
const { promisify } = require('util')

const validateSnapshot = require('./fixtures/snapshotSchema')
const validateProfile = require('./fixtures/profileSchema')

const sleep = promisify(setTimeout)
const logger = { info: spy(), error: spy() }

require('../src/preloader')(logger)

function cleanEnvironment() {
  for (const key of [
    'HEAP_PROFILER_SNAPSHOT',
    'HEAP_PROFILER_DESTINATION',
    'HEAP_PROFILER_SNAPSHOT_DESTINATION',
    'HEAP_PROFILER_PROFILE_DESTINATION',
    'HEAP_PROFILER_PROFILE_DURATION',
    'HEAP_PROFILER_PROFILE_INTERVAL'
  ]) {
    delete process.env[key]
  }

  logger.info.resetHistory()
  logger.error.resetHistory()
}

async function waitForReport(spy, calls, timeout) {
  const startTime = process.hrtime.bigint()

  while (spy.callCount < calls && Number(process.hrtime.bigint() - startTime) / 1e9 < timeout) {
    await sleep(100)
  }
}

t.test('it correctly generates reports when receiving USR2 and only once at time', async t => {
  cleanEnvironment()
  const snapshotDestination = await tmpName()
  const profileDestination = await tmpName()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION = snapshotDestination
  process.env.HEAP_PROFILER_PROFILE_DESTINATION = profileDestination
  process.env.HEAP_PROFILER_PROFILE_DURATION = 10
  process.env.HEAP_PROFILER_PROFILE_INTERVAL = 32768

  // Set the signal twices
  process.kill(process.pid, 'SIGUSR2')
  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.info, 5, 10)

  // Check the reports were only invoked once
  t.equal(logger.info.callCount, 5)
  t.true(
    logger.info
      .getCalls()
      .find(c => c.firstArg.endsWith('Received SIGUSR2 but generation is already happening. Doing nothing.'))
  )

  const generatedSnapshot = JSON.parse(readFileSync(snapshotDestination, 'utf-8'))
  const generatedProfile = JSON.parse(readFileSync(profileDestination, 'utf-8'))

  t.true(validateSnapshot(generatedSnapshot))
  t.true(validateProfile(generatedProfile))

  try {
    unlinkSync(process.env.HEAP_SNAPSHOT_DESTINATION)
    unlinkSync(process.env.HEAP_PROFILER_DESTINATION)
  } catch (e) {
    // No-op
  }
})

t.test('it correctly exclude reports based on environment variables', async t => {
  cleanEnvironment()
  const snapshotDestination = await tmpName()
  const profileDestination = await tmpName()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT = 'false'
  process.env.HEAP_PROFILER_PROFILE = 'false'

  // Set the signal twices
  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.info, 2, 10)

  // Check the reports were never invoked
  t.equal(logger.info.callCount, 2)
  t.throws(() => statSync(snapshotDestination), {
    message: `ENOENT: no such file or directory, stat '${snapshotDestination}'`
  })
  t.throws(() => statSync(profileDestination), {
    message: `ENOENT: no such file or directory, stat '${profileDestination}'`
  })
})

t.test('it correctly logs generation errors', async t => {
  cleanEnvironment()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION = '/this/doesnt/exists-1'
  process.env.HEAP_PROFILER_PROFILE_DESTINATION = '/this/doesnt/exists-2'
  process.env.HEAP_PROFILER_PROFILE_DURATION = 10
  process.env.HEAP_PROFILER_PROFILE_INTERVAL = 32768

  // Set the signal twices
  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.error, 1, 10)

  // Check the reports were not generated
  t.equal(logger.info.callCount, 1)
  t.equal(logger.error.callCount, 1)
})
