'use strict'

const generateHeapSnapshot = require('./snapshot')
const generateHeapSamplingProfile = require('./profile')

let working = false

process.on('SIGUSR2', () => {
  if (working) {
    console.log('[@nearform/heap-profile] Received SIGUSR2 but generation is already happening. Doing nothing.')
    return
  }

  working = true
  console.log('[@nearform/heap-profile] Received SIGUSR2. Generating heap reports ...')

  const takeSnapshot = process.env.HEAP_PROFILER_SNAPSHOT !== 'false'
  const takeProfile = process.env.HEAP_PROFILER_PROFILE !== 'false'
  const profileInterval =
    'HEAP_PROFILER_INTERVAL' in process.env ? parseInt(process.env.HEAP_PROFILER_INTERVAL, 10) : null
  const profileDuration =
    'HEAP_PROFILER_DURATION' in process.env ? parseInt(process.env.HEAP_PROFILER_DURATION, 10) : null

  const promises = []

  if (takeSnapshot) {
    promises.push(generateHeapSnapshot())
  }

  if (takeProfile) {
    promises.push(generateHeapSamplingProfile({ duration: profileDuration, interval: profileInterval }))
  }

  Promise.all(promises)
    .then(files => {
      console.log(`[@nearform/heap-profile] Generation completed. Results are in files ${files.join(' and ')}`)
    })
    .catch(e => {
      console.error('[@nearform/heap-profile] Generation failed.', e)
    })
    .finally(() => (working = false))
})

console.log(`[@nearform/heap-profile] Listening for SIGUSR2 signal on process ${process.pid}.`)
