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
    props: node.props(),
    links: node.links().map(item => item.path.startsWith(node.path + "/") ? convert(item) : { label: item.get("label"), props: {} }),
  };
}
