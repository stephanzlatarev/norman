
export default class Body {

  constructor(node) {
    this.node = node;
  }

  ok() {
    return (this.node.links() !== {});
  }

  async tick() {
    // Attach bodies
    for (const parent of this.node.links()) {
      await traverse(parent, async function(node) {
        if (((parent.get("status") === "attach") || (parent.get("status") === "attached")) && (node.get("status") !== "attached")) {
          node.set("status", "attaching");
        }
        if (((parent.get("status") === "detach") || (parent.get("status") === "detached")) && (node.get("status") !== "detached")) {
          node.set("status", "detaching");
        }
      });
    }
    await traverse(this.node, async function(node) {
      if (node.get("status") === "attaching") {
        await attach(node);
      } else if (node.get("status") === "detaching") {
        await detach(node);
      }
    });

    // Make bodies tick
    await traverse(this.node, async function(node) {
      const body = node.get("body");
      if (body && body.tick) {
        await body.tick();
      }
    }.bind(this));
  }

  async tock() {
    // Make bodies tock
    await traverse(this.node, async function(node) {
      const body = node.get("body");
      if (body && body.tock) {
        await body.tock();
      }
    }.bind(this));
  }

  async detach() {
    await traverse(this.node, async function(node) {
      await detach(node);
    });
  }

}

async function traverse(parent, op) {
  await traverseWithoutDuplicates(parent, op, {});
}

async function traverseWithoutDuplicates(parent, op, duplicate) {
  if (parent) {
    const links = parent.links();

    for (const child of links) {
      if (child.path.startsWith(parent.path + "/") && child.get("code") && !duplicate[child.ref]) { // This checks if the memory node represents a body, avoiding loops
        duplicate[child.ref] = true;
        await op(child);
        await traverseWithoutDuplicates(child, op, duplicate);
      }
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

  await traverse(node, async function(part) {
    const body = part.get("body");
    if (body && body.detach) {
      await body.detach();
    }
  });

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
