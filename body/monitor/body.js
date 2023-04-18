import fs from "fs";
import express from "express";
import bodyParser from "body-parser";

export default class Monitor {

  constructor(node) {
    this.node = node;
  }

  async attach() {
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());

    this.app.get("/", page);
    this.app.post("/", (request, response) => operation(this.node.memory, request, response));

    const port = this.node.get("port");
    this.app.listen(port, () => {
      console.log("Norman is listening on port", port);
    });
  }

}

async function page(_, response) {
  response.sendFile(fs.realpathSync("./body/monitor/monitor.html"));
}

async function operation(memory, request, response) {
  let result = [];

  try {
    for (const op of request.body) {
      const node = memory.get(op.path);

      if (op.action === "get") {
        result.push(convert(node));
      } else if (op.action === "set") {
        node.set(op.key, op.value);
      }
    }
  } catch (error) {
    console.log(error);
    result.push({ error: error.message ? error.message : JSON.stringify(error) });
  }

  response.json(result);
}

function convert(node) {
  return {
    path: node.path,
    ref: node.ref,
    label: node.get("label") ? node.get("label") : node.path.split("/").at(-1),
    props: props(node),
    links: node.links().map(item => filter(node, item)),
  };
}

function props(node) {
  const props = { path: node.path, ref: node.ref };

  for (const label in node.data) {
    const item = node.data[label];

    if ((typeof(item) === "boolean") || (typeof(item) === "number") || (typeof(item) === "string")) {
      props[label] = item;
    } else if (item && item.path) {
      props[label] = item.path + " (" + item.ref + ")";
    } else {
      props[label] = !!item ? "yes" : "no";
    }
  }

  return props;
}

function filter(node, child) {
  if (child.path.startsWith(node.path + "/")) {
    return convert(child);
  } else if (!node.path.startsWith(child.path)) {
    return { path: child.path, label: child.get("label"), props: props(child) };
  }
}
