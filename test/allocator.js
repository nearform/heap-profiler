'use strict'

const namesGenerator = require('docker-namesgenerator')
const { promisify } = require('util')
const sleep = promisify(setTimeout)

const names = {}

function generator() {
  let result = namesGenerator()

  if (names[result]) {
    result += names[result]++
  }

  names[result] = 1

  return result
}

module.exports = async function allocateMemoryFor(duration) {
  for (let i = 0; i < duration / 5; i++) {
    await sleep(5)

    for (let j = 0; j < 10; j++) {
      generator()
    }
  }
}
