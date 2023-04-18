
export default class Body {

  constructor(node) {
    this.node = node;
  }

  ok() {
    return !this.bodies || (this.bodies.length > 0);
  }

  async init() {
    this.bodies = [];

    for (const node of this.node.links()) {
      const body = await attach(node);

      if (body) {
        this.bodies.push(body);
      }
    }
  }

  async tick() {
    if (!this.bodies) {
      await this.init();
    }

    for (const body of this.bodies) {
      if (body.tick) {
        await body.tick();
      }
    }
  }

  async tock() {
    for (const body of this.bodies) {
      if (body.tock) {
        await body.tock();
      }
    }
  }

  async detach() {
    for (const node of this.node.links()) {
      await detach(node);
    }
  }

}

async function attach(node) {
  if (!node.get("code")) return;

  node.set("progress", new Date().getTime());

  const module = await import("../" + node.get("code") + "/body.js");
  const body = new module.default(node);

  if (body.attach) {
    await body.attach();
  }

  node.set("body", body);
  node.set("status", "attached");
  node.clear("progress");

  console.log("Successfully attached body:", node.path);

  return body;
}

async function detach(node) {
  node.set("progress", new Date().getTime());

  const body = node.get("body");
  if (body && body.detach) {
    await body.detach();
  }

  node.clear("body");
  node.clearLinks();

  node.set("status", "detached");
  node.clear("progress");

  console.log("Successfully detached body:", node.path);
}
