import { NjkService } from "./njk";

import { Worker } from "bullmq";

import { newQueue, runBullBoard } from "./queue";

import { program } from "commander";

program
  .option("-w, --worker", "Run worker")
  .option("-b, --bullboard", "Run BullBoard")
  .option("-r, --render", "Render templates")
  .parse(process.argv);

const runWorker = (njkService: NjkService) => {
  const worker = new Worker(
    "render",
    async (_) => {
      return njkService._renderString();
    },
    {
      connection: {
        host: "localhost",
        port: 6379,
      },
      concurrency: 300,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.log(`Job ${job!.id} failed with ${err.message}`);
  });
  console.log(worker.id);
  worker.waitUntilReady().then(() => {
    console.log("Worker is ready");
  });
};

const main = async () => {
  const options = program.opts();

  const { renderQueue: queue, queueEvents } = newQueue();

  if (options.bullboard) {
    runBullBoard(queue);
  }

  if (options.worker) {
    const njkService = new NjkService(queue, queueEvents);
    runWorker(njkService);
  }

  if (options.render) {
    const numRenders = 300;
    const numEpochs = 10;
    const renderTimes: { [key: string]: Array<number> } = {
      renderQueue: [],
      renderSingleThreaded: [],
    };

    for (let i = 0; i < numEpochs; i++) {
      const njkService = new NjkService(queue, queueEvents);

      const queueStart = Date.now();
      const promises = [];
      for (let i = 0; i < numRenders; i++) {
        promises.push(njkService.renderString());
      }
      // console.debug(`scheduling ${numRenders} jobs`);

      await Promise.all(promises);

      const queueEnd = Date.now();

      const singleThreadedStart = Date.now();

      for (let i = 0; i < numRenders; i++) {
        njkService._renderString();
      }

      const singleThreadedEnd = Date.now();

      renderTimes.renderQueue.push(queueEnd - queueStart);
      renderTimes.renderSingleThreaded.push(
        singleThreadedEnd - singleThreadedStart
      );
    }

    const mean = (arr: Array<number>) =>
      arr.reduce((a, b) => a + b, 0) / arr.length;

    console.log(
      `Average time taken for ${numEpochs} runs with ${numRenders} renders:\n
        - Queue: ${mean(renderTimes.renderQueue)}ms\n
        - Single Threaded: ${mean(renderTimes.renderSingleThreaded)}ms`
    );

    process.exit(0);
  }
};

await main();
