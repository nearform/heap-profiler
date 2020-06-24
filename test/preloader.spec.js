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
    'HEAP_PROFILER_SNAPSHOT_RUN_GC',
    'HEAP_PROFILER_DESTINATION',
    'HEAP_PROFILER_SNAPSHOT_DESTINATION',
    'HEAP_PROFILER_PROFILE_DESTINATION',
    'HEAP_PROFILER_PROFILE_DURATION',
    'HEAP_PROFILER_PROFILE_INTERVAL',
    'HEAP_PROFILER_TIMELINE',
    'HEAP_PROFILER_TIMELINE_DESTINATION',
    'HEAP_PROFILER_TIMELINE_RUN_GC',
    'HEAP_PROFILER_TIMELINE_DURATION'
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

t.test('it correctly generates reports when receiving USR2 and stop the second time', async t => {
  cleanEnvironment()
  const snapshotDestination = await tmpName()
  const profileDestination = await tmpName()
  const timelineDestination = await tmpName()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION = snapshotDestination
  process.env.HEAP_PROFILER_SNAPSHOT_RUN_GC = 'true'
  process.env.HEAP_PROFILER_PROFILE_DESTINATION = profileDestination
  process.env.HEAP_PROFILER_PROFILE_DURATION = 10
  process.env.HEAP_PROFILER_PROFILE_INTERVAL = 32768
  process.env.HEAP_PROFILER_TIMELINE_DESTINATION = timelineDestination
  process.env.HEAP_PROFILER_TIMELINE_RUN_GC = 'true'

  // Set the signal to start
  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.info, 4, 10)
  t.equal(logger.info.callCount, 4)
  // stop timeline
  process.kill(process.pid, 'SIGUSR2')
  await waitForReport(logger.info, 6, 10)
  t.equal(logger.info.callCount, 6)

  const generatedSnapshot = JSON.parse(readFileSync(snapshotDestination, 'utf-8'))
  const generatedProfile = JSON.parse(readFileSync(profileDestination, 'utf-8'))
  const generatedTimeline = JSON.parse(readFileSync(timelineDestination, 'utf-8'))

  validateSnapshot(generatedSnapshot)
  t.strictSame(validateSnapshot.errors, null)
  validateProfile(generatedProfile)
  t.strictSame(validateProfile.errors, null)
  validateSnapshot(generatedTimeline)
  t.strictSame(validateSnapshot.errors, null)

  try {
    unlinkSync(snapshotDestination)
    unlinkSync(profileDestination)
    unlinkSync(timelineDestination)
  } catch (e) {
    // No-op
  }
})

t.test('it correctly exclude reports based on environment variables', async t => {
  cleanEnvironment()
  const snapshotDestination = await tmpName()
  const profileDestination = await tmpName()
  const timelineDestination = await tmpName()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT = 'false'
  process.env.HEAP_PROFILER_PROFILE = 'false'
  process.env.HEAP_PROFILER_TIMELINE = 'false'
  process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION = snapshotDestination
  process.env.HEAP_PROFILER_PROFILE_DESTINATION = profileDestination
  process.env.HEAP_PROFILER_TIMELINE_DESTINATION = timelineDestination

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
  t.throws(() => statSync(timelineDestination), {
    message: `ENOENT: no such file or directory, stat '${timelineDestination}'`
  })
})

t.test('it should run continuously', async t => {
  cleanEnvironment()

  // Set preloader variables
  const snapshotDestination = await tmpName()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION = snapshotDestination
  process.env.HEAP_PROFILER_PROFILE = 'false'
  process.env.HEAP_PROFILER_TIMELINE = 'false'

  // first snapshot
  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.info, 3, 10)
  t.equal(logger.info.callCount, 3)

  // second snapshot
  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.info, 6, 10)

  // Check the report was generated
  t.equal(logger.info.callCount, 6)
})

t.test('it correctly logs generation errors', async t => {
  cleanEnvironment()

  // Set preloader variables
  process.env.HEAP_PROFILER_SNAPSHOT_DESTINATION = '/this/doesnt/exists-1'
  process.env.HEAP_PROFILER_PROFILE_DESTINATION = '/this/doesnt/exists-2'
  process.env.HEAP_PROFILER_TIMELINE_DESTINATION = '/this/doesnt/exists-3'
  process.env.HEAP_PROFILER_PROFILE_DURATION = 10
  process.env.HEAP_PROFILER_PROFILE_INTERVAL = 32768

  process.kill(process.pid, 'SIGUSR2')

  // Wait for generators time to finish
  await waitForReport(logger.error, 1, 10)

  // Check the reports were not generated
  t.equal(logger.info.callCount, 2)
  t.equal(logger.error.callCount, 1)
})
