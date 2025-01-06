# @nearform/heap-profiler

[![Package Version](https://img.shields.io/npm/v/@nearform/heap-profiler.svg)](https://npm.im/@nearform/heap-profiler)
[![Build Status](https://img.shields.io/github/workflow/status/nearform/heap-profiler/CI)](https://github.com/nearform/heap-profiler/actions?query=workflow%3ACI)

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

Then you will be able make a snapshot, start profiling heap, and start tracking allocation timeline by sending the process a SIGUSR2 signal, like this:

```
kill -USR2 $PID
```

Heap snapshot will be generated immediately.

Heap sampling profiler and allocation timeline must be stopped, by sending another SIGUSR2 signal to the process.

Then the tool will await on the next signal, to resume profiling/tracking/shooting the heap.

The preloader uses the following environment variables to control its behavior:

- `HEAP_PROFILER_PRELOADER_DISABLED`: If set to `true`, the preloader is not installed and you need to use the API to sample the process.

- `HEAP_PROFILER_SNAPSHOT`: If set to `false`, it will not generate heap dump snapshots.

- `HEAP_PROFILER_SNAPSHOT_DESTINATION`: The path where to store the snapshot. The default will be a `.heapsnapshot` in the current directory.

- `HEAP_PROFILER_SNAPSHOT_RUN_GC`: If to run the garbage collector before taking the snapshot. The default is `false` and it is ignored if the process is not started with the `--expose-gc` flag.

- `HEAP_PROFILER_PROFILE`: If set to `false`, it will not generate heap sampling profile.

- `HEAP_PROFILER_PROFILE_DESTINATION`: The path where to store the profile. The default will be a `.heapprofile` in the current directory.

- `HEAP_PROFILER_PROFILE_INTERVAL`: Heap sampling profile interval, in bytes. Default is `32768` (32KB).

- `HEAP_PROFILER_TIMELINE`: If set to `false`, it will not start tracking timeline allocation.

- `HEAP_PROFILER_TIMELINE_DESTINATION`: The path where to store the allocation timeline. The default will be a `.heaptimeline` in the current directory.

- `HEAP_PROFILER_TIMELINE_RUN_GC`: Whether or not running Garbage Collector before and after the allocation timeline, to see only remaining objects (default to false).

- `HEAP_PROFILER_LOGGING_DISABLED`: If set to `true`, it will disable logging.

## API

All module functions can be used with promises and by providing a callback as last option.

The promise resolved value (or the callback argument) will be the generated file path.

The available functions are:

- `generateHeapSnapshot([options], [callback]): [Promise]`: Generates a heap dump

  - `destination`: The path where to store the snapshot. The default will be a `.heapsnapshot` in the current directory.
  - `runGC`: If to run the garbage collector before taking the snapshot. The default is `false` and it is ignored if the process is not started with the `--expose-gc` flag.

- `generateHeapSamplingProfile([options], [callback]): [Promise]`: Starts generating a heap sampling profiler. The valid options are:

  - `destination`: The path where to store the profile. The default will be a `.heapprofile` in the current directory.
  - `interval`: Sample interval, in bytes. Default is `32768` (32KB).
  - `duration`: Sample duration, in milliseconds. Default is `10000` (10 seconds), and it is ignored if `signal` is provided.
  - `signal`: The [AbortController](http://npm.im/abort-controller) `signal` to use to stop the operation.

  The function accepts a callback function, otherwise it returns a Promise. The resolved value (or the callback argument) will be
  the generated file path.

- `recordAllocationTimeline([options], [callback]): [Promise]`: Starts recording allocation on heap. The valid options are:

  - `destination`: The path where to store the timeline. The default will be a `.heaptimeline` in the current directory.
  - `runGC`: If to run the garbage collector at the begining and the end of the timeline. The default is `false` and it is ignored if the process is not started with the `--expose-gc` flag.
  - `duration`: Recording duration, in milliseconds. Default is `10000` (10 seconds), and it is ignored if `signal` is provided.
  - `signal`: The [AbortController](http://npm.im/abort-controller) `signal` to use to stop the operation.

  The function accepts a callback function, otherwise it returns a Promise. The resolved value (or the callback argument) will be
  the generated file path.

## Performance impact

Generating a heap dump snapshot is handled synchronously by Node and therefore **will block your process completely**.

Generating a heap sampling profile or record allocation timeline is instead asynchronous and lightweight. Our test showed that the **performance decrease is around 10%**.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

Copyright NearForm Ltd 2020-2022. Licensed under the [Apache-2.0 license](http://www.apache.org/licenses/LICENSE-2.0).

[![banner](https://raw.githubusercontent.com/nearform/.github/refs/heads/master/assets/os-banner-green.svg)](https://www.nearform.com/contact/?utm_source=open-source&utm_medium=banner&utm_campaign=os-project-pages)