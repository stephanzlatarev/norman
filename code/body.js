
const BODY = "body";
const PROGRESS = "progress";
const ATTACHED = "attached";
const ATTACHING = "attaching";
const DETACHING = "detaching";

export default class Body {

  constructor(memory, label, code, config) {
    this.memory = memory;
    this.node = memory.add(label).set("type", memory.add(BODY));
    this.code = code;
    this.config = config;

    this.timer = setInterval(this.run.bind(this), 1000);
  }

  isAttached() {
    return !!this.node.get(ATTACHED);
  }

  async attach() {
    this.node.set(PROGRESS, new Date().getTime());

    const module = await import("../" + this.code + "/body.js");

    this.body = new module.default(this.memory.model(), this.config);

    if (this.body && this.body.attach) {
      await this.body.attach();
    }

    this.node.set(ATTACHED, true);
    this.node.clear(PROGRESS);

    console.log("Successfully attached body:", this.code);
  }

  async detach() {
    this.node.set(PROGRESS, new Date().getTime());

    if (this.body && this.body.detach) {
      await this.body.detach();
    }

    this.node.set(ATTACHED, false);
    this.node.clear(PROGRESS);

    console.log("Successfully detached body:", this.code);
  }

  async run() {
    if (!this.node.get(PROGRESS)) {
      if (this.node.get(ATTACHING)) {
        this.node.clear(ATTACHING);
        await this.attach();
      }
      if (this.node.get(DETACHING)) {
        this.node.clear(DETACHING);
        await this.detach();
      }
    }
  }

  async destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;

      await this.detach();
    }
  }

}
