# nunjucks-queue-benchmark

## Foreword

The benchmark consists of 300 renders of a nunjucks template that features a
nested for loop with random number choice (to prevent caching)

Objetive is to recreate an environment where `NjkService.renderString()` method
is called heavily and yields +500ms renders and optimize

## Results

Average time taken for 10 runs with 300 renders:
(3 workers and concurrency set at 100)

- Queue: 216.3ms
- Single Threaded: 739.3ms

Slightly different template, with distribution of the 10 runs:

- Queue: 332.6ms

  - Runs: `[ 371, 331, 325, 348, 322, 331, 333, 317, 315, 333 ]`

- Single threaded: 772.8ms
  - Runs: `[ 756, 751, 824, 752, 856, 751, 764, 781, 722, 771 ]`

Running 5 workers 60 concurrency hangs redis sometimes, if it passes it brings
worse results than 3 workers

## Conclusion

I think that the BullMQ is a bad choice, running RabbitMQ would yield way way
better results. With more than 3 workers, the time to process goes up to double
the single threaded; this is really poor performance

Generally, the more complex the render the better performance improvement from
parallelism, but it should not be an issue to spawn 5-10 workers and it should
be possible to cut down the render time to 1/5th of the single threaded time

Of course, milage may vary - passing the context into the messages might bring
overhead and there might be retries which could deteriorate performance

## Next Steps

- run with RabbitMQ as transport, try to get better results
- batch the `NjkService.renderString()` calls in the sellix.io shop application
  to benefit from the parallelism
- run profiling in staging to ensure performance improvement holds for the
  production workload
- the `renderString` calls that render larger precompiled templates have to be
  distributed, while the 'smaller' calls that render a configuration curly brace
  should remain to run on a single thread

## Usage

```bash
bun install # install deps
```

Be sure to have Redis available on `localhost:6379`

```sh
bun run index.ts --worker # run worker
```

```sh
bun run index.ts --render # run benchmark
```
