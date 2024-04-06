import nunjucks from "nunjucks";
import { Queue, QueueEvents } from "bullmq";

export class NjkService {
  constructor(private queue: Queue, private queueEvents: QueueEvents) {
    nunjucks.configure({ autoescape: true });
  }

  _renderString(): any {
    return nunjucks.render("main.njk", {});
  }

  async renderString(): Promise<any> {
    const job = await this.queue.add("render", {});
    return await job.waitUntilFinished(this.queueEvents);
  }
}
