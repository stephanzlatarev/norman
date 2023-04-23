import Body from "./body.js";
import Memory from "./memory.js";
import { loadSkills } from "./skills.js";

export default class Norman {

  constructor(env) {
    this.memory = new Memory();

    for (const goal of env.goals) {
      this.memory.add(goal).set("goal", true);
    }

    this.body = [];
    for (const body of env.body) {
      if (body.label && body.code) {
        this.body.push(new Body(this.memory, body.label, body.code, body.config));
      }
    }

  }

  async start() {
    console.log("Hi!");

    await loadSkills(this.memory);

    this.time = 0;
    this.timer = setInterval(this.run.bind(this), 1000);

    for (const body of this.body) {
      await body.attach();
    }

    this.isStarted = true;
  }

  run() {
    this.memory.add("Norman")
      .set("time", this.time++)
      .set("nodes", this.memory.metrics.nodes)
      .set("patterns", this.memory.metrics.patterns)
      .set("changes", this.memory.metrics.changes);

    const metrics = this.memory.add("Memory patterns");
    let otherConsumedTime = 0;
    for (const pattern of this.memory.patterns) {
      if (pattern.name) {
        metrics.set(pattern.name, pattern.consumedTime);
      } else {
        otherConsumedTime += pattern.consumedTime;
      }
    }
    metrics.set("others", otherConsumedTime);

    if (this.isStarted) {
      for (const body of this.body) {
        if (body.isAttached()) return;
      }

      this.stop();
    }
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    for (const body of this.body) {
      await body.destroy();
    }

    console.log("Bye!");
    process.exit(0);
  }

}
