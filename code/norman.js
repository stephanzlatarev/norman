import Body from "./body.js";

export default class Norman {

  constructor(env) {
    this.body = [];

    for (const body of env.body) {
      if (body.label && body.code) {
        this.body.push(new Body(body.label, body.code, body.config));
      }
    }
  }

  async start() {
    console.log("Hi!");

    this.time = 0;
    this.timer = setInterval(this.run.bind(this), 1000);

    try {
      for (const body of this.body) {
        await body.attach();
      }

      this.isStarted = true;
    } catch (error) {
      console.log(error);
      this.stop();
    }
  }

  run() {
    if (this.isStarted) {
      if (!this.body.find(body => body.isAttached)) {
        this.stop();
      }
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
