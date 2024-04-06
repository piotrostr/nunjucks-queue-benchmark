import { Queue, Job, QueueEvents } from "bullmq";
import express from "express";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

export interface WorkerFn {
  (job: Job): Promise<any>;
}

export const newQueue = () => {
  const renderQueue = new Queue("render");
  const queueEvents = new QueueEvents("render");
  renderQueue.setMaxListeners(500);
  queueEvents.setMaxListeners(500);

  return { renderQueue, queueEvents };
};

export const runBullBoard = (queue: Queue) => {
  const serverAdapter = new ExpressAdapter();

  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter: serverAdapter,
  });

  const app = express();

  app.use("/admin/queues", serverAdapter.getRouter());

  // other configurations of your server

  app.listen(3000, () => {
    console.log("Running on 3000...");
    console.log("For the UI, open http://localhost:3000/admin/queues");
    console.log("Make sure Redis is running on port 6379 by default");
  });
};
