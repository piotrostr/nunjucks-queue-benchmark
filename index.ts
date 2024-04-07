import { NjkService } from "./njk";

import { Worker } from "bullmq";

import { newQueue, runBullBoard } from "./queue";

import { program } from "commander";

program
  .option("-w, --worker", "Run worker")
  .option("-b, --bullboard", "Run BullBoard")
  .option("-r, --render", "Render templates")
  .parse(process.argv);

let total = 0;

const runWorker = (njkService: NjkService, concurrency: number) => {
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
      concurrency,
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed, total: ${total++}`);
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

  const numRenders = 300;
  const numEpochs = 10;
  const concurrency = 60;

  if (options.bullboard) {
    runBullBoard(queue);
  }

  if (options.worker) {
    const njkService = new NjkService(queue, queueEvents);
    runWorker(njkService, concurrency);
  }

  if (options.render) {
    const renderTimes: { [key: string]: Array<number> } = {
      renderQueue: [],
      renderSingleThreaded: [],
    };

    for (let i = 0; i < numEpochs; i++) {
      const njkService = new NjkService(queue, queueEvents);

      const promises = [];
      for (let i = 0; i < numRenders; i++) {
        promises.push(njkService.renderString());
      }
      console.log(`scheduling ${numRenders} jobs`);
      const queueStart = Date.now();
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
      Queue: ${mean(renderTimes.renderQueue)}ms
      Single threaded: ${mean(renderTimes.renderSingleThreaded)}ms`
    );
    console.log(renderTimes.renderQueue, renderTimes.renderSingleThreaded);
    process.exit(0);
  }
};

await main();
