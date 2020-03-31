# @nearform/heap-profiler

[![Package Version](https://img.shields.io/npm/v/@nearform/heap-profiler.svg)](https://npm.im/@nearform/heap-profiler)
[![Dependency Status](https://img.shields.io/david/nearform/heap-profiler)](https://david-dm.org/nearform/heap-profiler)
[![Build Status](https://img.shields.io/github/workflow/status/nearform/heap-profiler/workflows/CI/badge.svg)](https://github.com/nearform/heap-profiler/actions?query=workflow%3ACI)

Heap dump and sample profiler generator for Node.

## Installation

Just run:

```bash
npm install @nearform/heap-profiler
```

## Preloader

Once installed, the profiler can be used as a preloader that adds a listener to `SIGUSR2` signal.

If you start your application like this:

```
node -r @nearform/heap-profiler index.js
```

Then you will be able to generate a heap profile and heap snapshot by sending the process a SIGUSR2 signal, like this:

```
kill -USR2 $PID
```

The preloader uses the following environment variables to control its behavior:

- `HEAP_PROFILER_SNAPSHOT`: If set to `false`, it will not generate heap dump snapshots.
- `HEAP_PROFILER_PROFILE`: If set to `false`, it will not generate heap sampling profile.
- `HEAP_PROFILER_INTERVAL`: Heap sampling profile interval, in bytes. Default is `32768` (32KB).
- `HEAP_PROFILER_DURAITON`: Heap sampling profile in milliseconds. Default is `10000` (10 seconds).

## API

All module functions can be used with promises and by providing a callback as last option.

The promise resolved value (or the callback argument) will be the generated file path.

The available functions are:

- `generateHeapSnapshot([callback])`: Generates a heap dump.
- `generateHeapSamplingProfile([options], [callback])`: Generates a heap sampling profiler. The valid options are:
  - `interval`: Sample interval, in bytes. Default is `32768` (32KB).
  - `duration`: Sample duration, in milliseconds. Default is `10000` (10 seconds).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

Copyright NearForm Ltd 2020. Licensed under the [Apache-2.0 license](http://www.apache.org/licenses/LICENSE-2.0).
