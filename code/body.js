
export default class Body {

  isAttached = false;

  // Setting isAttaching or isDetaching to true will trigget attaching or detaching of the body
  isAttaching = false;
  isDetaching = false;

  // Progress is an increasing positive number while this body is attaching or detaching
  progress = 0;

  constructor(label, code, config) {
    this.label = label;
    this.code = code;
    this.config = config || {};

    this.timer = setInterval(this.run.bind(this), 1000);
  }

  async attach() {
    if (this.isAttached) return;

    this.progress = new Date().getTime();

    const module = await import("../" + this.code + ".js");

    this.body = new module.default(this.config);

    if (this.body && this.body.attach) {
      await this.body.attach(this.detach.bind(this));
    }

    this.isAttached = true;
    this.progress = 0;

    console.log("Successfully attached body:", this.code);
  }

  async detach() {
    if (!this.isAttached) return;

    this.progress = new Date().getTime();

    if (this.body && this.body.detach) {
      await this.body.detach();
    }

    this.isAttached = false;
    this.progress = 0;

    console.log("Successfully detached body:", this.code);
  }

  async run() {
    if (!this.progress) {
      if (this.isAttaching) {
        this.isAttaching = false;

        await this.attach();
      }

      if (this.isDetaching) {
        this.isDetaching = false;

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
