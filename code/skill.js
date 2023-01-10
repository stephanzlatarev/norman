import fs from "fs";
import layers from "./memory/layers.js";

export default class Skill {

  constructor(node) {
    this.node = node;
  }

  async find(goal) {
    if (!this.didLoadSkills) {
      await loadAll(this.node);
      this.didLoadSkills = true;
    }

    return find(this.node, goal);
  }

  // The skill takes two graph patterns - one for the input and one for the output.
  // It generates alternative memory layers for the matches of the input graph pattern and the memory.
  // It feeds all memory layers into the skill brain one by one.
  // The skill brain produces output which is written in the memory following the output graph pattern.
  //
  // The body will read the memory during tock phase and will issue motor commands accordingly.
  async perform(goal, skill, body) {
    const layer = skill.get("memory");
    if (layer) {
      const pattern = { ...layer };
      pattern.nodes = { ...layer.nodes, GOAL: goal, BODY: body };

      for (const one of layers(goal.memory, pattern)) {
        await performOnce(skill, one);
      }
    } else {
      await performOnce(skill, body);
    }
  }
}

async function performOnce(skill, layer) {
  const sensor = [];

  for (const input of skill.get("input")) {
    const node = layer.get(input);

    if (typeof(node) === "number") {
      sensor.push(node);
    } else if (node && node.ref) {
      sensor.push(node.ref);
    } else {
      sensor.push(0);
    }
  }

  const motor = await skill.get("skill").react(sensor);

  if (motor) {
    for (let i = 0; i < skill.data.output.length; i++) {
      layer.set(skill.data.output[i], motor[i]);
    }
  }
}

async function load(node) {
  const path = "./" + node.get("code") + "/";

  const mapping = JSON.parse(fs.readFileSync(path + "mapping.json"));
  for (const key in mapping) {
    node.set(key, mapping[key]);
  }

  if (fs.existsSync(path + "brain.js")) {
    const module = await import("." + path + "brain.js");
    node.set("skill", new module.default());
  }
}

async function loadAll(node) {
  for (const skill of node.links()) {
    if (skill.get("code")) {
      await load(skill);
    }

    await loadAll(skill);
  }
}

function find(node, goal, output) {
  if (!output) output = [];

  for (const skill of node.links()) {
    if (skill.get("goal") === goal) {
      output.push(skill);
    }

    find(skill, goal, output);
  }

  return output;
}
