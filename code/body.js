import path from "path";

export default class Body {

  isAttached = false;

  constructor(label, code, config) {
    this.label = label;
    this.code = code;
    this.config = config || {};
  }

  async attach() {
    if (this.isAttached) return;

    const module = await import("file://" + path.resolve(this.code + ".js"));

    this.body = new module.default(this.config);

    if (this.body && this.body.attach) {
      await this.body.attach();
    }

    this.isAttached = true;

    console.log("Attached body:", this.code);
  }

  async detach() {
    if (!this.isAttached) return;

    if (this.body && this.body.detach) {
      await this.body.detach();
    }

    this.isAttached = false;

    console.log("Detached body:", this.code);
  }

  async observe() {
    if (this.isAttached && this.body && this.body.observe) {
      await this.body.observe();
    }
  }

  async act() {
    if (this.isAttached && this.body && this.body.act) {
      await this.body.act();
    }
  }

}
