import fs from "fs";
import layers from "./memory/layers.js";
import Node from "./memory/node.js";

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

      let cache;
      for (const one of layers(goal.memory, pattern)) {
        const output = await performOnce(skill, one, cache);

        if (output) {
          cache = output;
        }
      }
    } else {
      await performOnce(skill, body);
    }
  }
}

async function performOnce(skill, layer, cache) {
  const sensor = [];

  for (const input of skill.get("input")) {
    const node = layer.get(input);

    if (typeof(node) === "number") {
      sensor.push(node);
    } else if (typeof(node) === "boolean") {
      sensor.push(node ? 1 : 0);
    } else if (node instanceof Node) {
      sensor.push(node.ref);
    } else {
      sensor.push(0);
    }
  }

  if (cache) {
    for (const one of cache) {
      sensor.push(one);
    }
  }

  const motor = await skill.get("skill").react(sensor);

  if (motor) {
    for (let i = 0; i < skill.data.output.length; i++) {
      if (skill.data.output[i]) {
        layer.set(skill.data.output[i], motor[i]);
      }
    }
  }

  return motor;
}

async function load(node) {
  const path = "./" + node.get("code") + "/";
  const pathMapping = path + "mapping.json";

  if (fs.existsSync(pathMapping)) {
    const mapping = JSON.parse(fs.readFileSync(pathMapping));
    for (const key in mapping) {
      node.set(key, mapping[key]);
    }

    if (fs.existsSync(path + "brain.js")) {
      const module = await import("." + path + "brain.js");
      node.set("skill", new module.default());

      console.log("Successfully loaded skill:", node.get("label"));
    }
  }
}

async function loadAll(node) {
  const skills = node.links();

  if (skills.length) {
    for (const skill of skills) {
      if (skill.get("code")) {
        await load(skill);
      }

      await loadAll(skill);
    }
  } else {
    await loadFolder(node, "./skill");
  }
}

async function loadFolder(node, folder) {
  const subfolders = fs.readdirSync(folder, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

  if (subfolders.length) {
    for (const subfolder of subfolders) {
      await loadFolder(node, folder + "/" + subfolder);
    }
  } else {
    const path = node.path + "/" + folder.replace(/[/]/g, "-");
    await load(node.memory.get(path).set("type", "skill").set("code", folder.substring(2)));
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
