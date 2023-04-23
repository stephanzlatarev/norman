import fs from "fs";
import express from "express";
import bodyParser from "body-parser";

export default class Monitor {

  constructor(model, config) {
    this.model = model;
    this.config = config;
    this.charts = [];

    if (config.charts) {
      for (const chart of config.charts) {
        this.charts.push(new Chart(this.model.memory, chart));
      }
    }
  }

  async attach() {
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());

    this.app.get("/", page);
    this.app.post("/", (request, response) => operation(this, request, response));

    const port = this.config.port;
    this.app.listen(port, () => {
      console.log("Norman is listening on port", port);
    });
  }

}

class Chart {

  constructor(memory, config) {
    this.data = JSON.parse(JSON.stringify(config));
    this.tick = null;
    this.map = {};

    if (config.type === "line") {
      this.data.ticks.data = [];
      this.map[config.ticks.title] = this.data.ticks.data;

      const pattern = { nodes: {}, infos: {} };
      this.populatePattern(pattern, this.data.ticks.title, this.data.ticks.memory);

      for (const series of this.data.series) {
        series.data = [];
        this.map[series.title] = series.data;
        this.populatePattern(pattern, series.title, series.memory);
      }

      memory.pattern(pattern).listen(this.onLineChanges.bind(this));
    } else if (config.type === "top") {
      this.data.series = [];
      this.data.ticks.data = [];

      const pattern = { nodes: { TOP: { label: this.data.memory } }, infos: { TOP: { node: "TOP" } } };
      this.populatePattern(pattern, "XAXIS", this.data.ticks.memory);

      this.pattern = memory.pattern(pattern).listen(this.onTopChanges.bind(this));
    } else if (config.type === "scatter") {
      for (const series of this.data.series) {
        series.data = [];
        this.map[series.title] = series.data;

        const pattern = { nodes: {}, infos: {} };
        this.populatePattern(pattern, "tick", this.data.ticks.memory);

        const nodeKey = series.title.toUpperCase();
        pattern.nodes[nodeKey] = series.memory[0];
        pattern.infos[series.title] = { node: nodeKey };
        pattern.infos["id"] = { node: nodeKey, label: series.id };
        pattern.infos["x"] = { node: nodeKey, label: series.x };
        pattern.infos["y"] = { node: nodeKey, label: series.y };

        memory.pattern(pattern).listen(this.onScatterChanges.bind(this));
      }
    }
  }

  populatePattern(pattern, key, path) {
    const nodeKey = path[0].toUpperCase();

    pattern.nodes[nodeKey] = { label: path[0] };
    pattern.infos[key] = { node: nodeKey, label: path[1] };
  }

  onLineChanges(match) {
    const ticks = this.map[this.data.ticks.title];
    const lastTick = (ticks && ticks.length) ? ticks[ticks.length - 1] : undefined;
    const thisTick = match[this.data.ticks.title];

    if (thisTick === lastTick) {
      for (const key in match) {
        const array = this.map[key];
        array[array.length - 1] = match[key];
      }
    } else {
      for (const key in match) {
        this.map[key].push(match[key]);
      }
    }
  }

  onTopChanges() {
    for (const match of this.pattern) {
      const top = match.node("TOP");
      const updated = {};

      // Construct array for the new measurements
      for (const key in top.data) {
        if (!this.map[key]) {
          const array = [];
          for (let i = 0; i < this.data.ticks.data.length; i++) array.push(0);
          this.map[key] = array;
        }
      }

      // Store the measurements
      for (const key in top.data) {
        this.map[key].push(top.get(key));
        updated[key] = true;
      }

      // Repeat measurements which don't appear in the update
      for (const key in this.map) {
        if (!updated[key]) {
          const array = this.map[key];
          array.push(array[array.length - 1]);
        }
      }

      // Add the x-axis
      this.data.ticks.data.push(match.info().XAXIS);
      break;
    }

    const colors = ["darkred", "orange", "plum", "indigo"];
    const top = [];
    for (const key in this.map) {
      top.push({
        title: key,
        color: "black",
        data: this.map[key],
        per: this.data.per,
      });
    }
    top.sort((a, b) => b.data[b.data.length - 1] - a.data[a.data.length - 1]);
    top.length = Math.min(top.length, colors.length);
    for (let i = 0; i < top.length; i++) top[i].color = colors[i];
    this.data.series = top;
  }

  onScatterChanges(match) {
    if (match.tick !== this.tick) {
      this.tick = match.tick;

      for (const title in this.map) {
        this.map[title].length = 0;
      }
    }

    let title;
    for (const key in match) {
      if ((key !== "tick") && (key !== "id") && (key !== "x") && (key !== "y")) {
        title = key;
      }
    }

    if (title) {
      let item = this.map[title].find(item => (item.id === match.id));
      if (!item) {
        item = { id: match.id, x: match.x, y: match.y };
        this.map[title].push(item);
      } else {
        item.x = match.x;
        item.y = match.y
      }
    }
  }

}

async function page(_, response) {
  response.sendFile(fs.realpathSync("./body/monitor/monitor.html"));
}

async function operation(monitor, request, response) {
  const model = monitor.model;
  const op = request.body;
  let result = [];

  try {
    if (op.action === "list") {
      for (const node of model.all(op.node)) {
        result.push(convert(node));
      }
    } else if (op.action === "set") {
      model.one(op.node).set(op.key, op.value);
    } else if (op.action === "charts") {
      if (monitor.config.layout && monitor.config.layout.charts) {
        monitor.config.layout.charts.kind = "layout";
        result.push(monitor.config.layout.charts);
      }

      for (const chart of monitor.charts) {
        result.push(chart.data);
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
    ref: node.ref,
    label: node.label,
    props: props(node),
  };
}

function props(node) {
  const props = {};

  for (const label in node.data) {
    const item = node.data[label];

    if (typeof(item) === "number") {
      props[label] = item;
    } else if (item && item.ref && item.label) {
      props[label] = item.label + " (#" + item.ref + ")";
    }
  }

  return props;
}
