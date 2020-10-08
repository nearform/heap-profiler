# @nearform/heap-profiler

[![Package Version](https://img.shields.io/npm/v/@nearform/heap-profiler.svg)](https://npm.im/@nearform/heap-profiler)
[![Dependency Status](https://img.shields.io/david/nearform/heap-profiler)](https://david-dm.org/nearform/heap-profiler)
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

Heap snapshot will be immediately available, heap profile will be done after the specified duration (10s by default).
Allocation timeline must be stopped, by sending another SIGUSR2 signal to the process.
Then the tool will await on the next signal, to resume profiling/tracking/shooting the heap. 

The preloader uses the following environment variables to control its behavior:

- `HEAP_PROFILER_SNAPSHOT`: If set to `false`, it will not generate heap dump snapshots.

- `HEAP_PROFILER_SNAPSHOT_DESTINATION`: The path where to store the snapshot. The default will be a `.heapsnapshot` in the current directory.

- `HEAP_PROFILER_SNAPSHOT_RUN_GC`: If to run the garbage collector before taking the snapshot. The default is `false` and it is ignored if the process is not started with the `--expose-gc` flag.

- `HEAP_PROFILER_PROFILE`: If set to `false`, it will not generate heap sampling profile.

- `HEAP_PROFILER_PROFILE_DESTINATION`: The path where to store the profile. The default will be a `.heapprofile` in the current directory.

- `HEAP_PROFILER_PROFILE_INTERVAL`: Heap sampling profile interval, in bytes. Default is `32768` (32KB).

- `HEAP_PROFILER_PROFILE_DURAITON`: Heap sampling profile in milliseconds. Default is `10000` (10 seconds).

- `HEAP_PROFILER_TIMELINE`: If set to `false`, it will not start tracking timeline allocation.

- `HEAP_PROFILER_TIMELINE_DESTINATION`: The path where to store the allocation timeline. The default will be a `.heaptimeline` in the current directory.

- `HEAP_PROFILER_TIMELINE_RUN_GC`: Whether or not running Garbage Collector before and after the allocation timeline, to see only remaining objects (default to false).

- `HEAP_PROFILER_LOGGING_DISABLED`: Whether or not disable logging

## API

All module functions can be used with promises and by providing a callback as last option.

The promise resolved value (or the callback argument) will be the generated file path.

The available functions are:

- `generateHeapSnapshot([options], [callback]): [Promise]`: Generates a heap dump

  - `destination`: The path where to store the snapshot. The default will be a `.heapsnapshot` in the current directory.
  - `runGC`: If to run the garbage collector before taking the snapshot. The default is `false` and it is ignored if the process is not started with the `--expose-gc` flag.

- `generateHeapSamplingProfile([options], [callback]): [Promise]`: Generates a heap sampling profiler. The valid options are:

  - `destination`: The path where to store the profile. The default will be a `.heapprofile` in the current directory.
  - `interval`: Sample interval, in bytes. Default is `32768` (32KB).
  - `duration`: Sample duration, in milliseconds. Default is `10000` (10 seconds).

- `recordAllocationTimeline([options], [callback]): [function|Promise]`: Starts recording allocation on heap. The valid options are:

  - `destination`: The path where to store the timeline. The default will be a `.heaptimeline` in the current directory.
  - `runGC`: If to run the garbage collector at the begining and the end of the timeline. The default is `false` and it is ignored if the process is not started with the `--expose-gc` flag.

   When using callback-style, call the returned function to stop recording allocation, and generate the output file: 
   ```js
   const stop = recordAllocationTimeline(options, (err) => { /* handle start errors */ })
   // later on...
   stop((err) => { /* handle stop errors, and use the file */ })
   ```
   When using promise-style, the returned promise will resolve with an async function for the same purposes:
   ```js
   const stop = await recordAllocationTimeline(options)
   // catch any start error
   // later on...
   await stop()
   // catch any stop errors, and use the file
   ```

## Performance impact

Generating a heap dump snapshot is handled synchronously by Node and therefore **will block your process completely**.

Generating a heap sampling profile is instead asynchronous and lightweight. Our test showed that the **performance decrease is around 10%**.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

Copyright NearForm Ltd 2020. Licensed under the [Apache-2.0 license](http://www.apache.org/licenses/LICENSE-2.0).
