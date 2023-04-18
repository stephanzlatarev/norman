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
  // The skill brain produces output. The last output is written in the memory following the output graph pattern.
  async perform(goal, skill) {
    let layer = skill.get("memory");
    let memory;
    let motor;

    const pattern = { ...layer };
    pattern.nodes = { ...layer.nodes, GOAL: goal };

    for (const one of layers(goal.memory, pattern)) {
      const output = await iterate(skill, one, motor);

      if (output) {
        memory = one;
        motor = output;
      }
    }

    if (memory && motor) {
      const output = skill.data.output;

      for (let i = 0; i < output.length; i++) {
        if (output[i]) {
          memory.set(output[i], motor[i]);
        }
      }
    }
  }
}

async function iterate(skill, layer, cache) {
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

  return await skill.get("skill").react(sensor);
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
    const skillGoals = skill.get("goal");
    if (skillGoals === goal) {
      output.push(skill);
    } else if (Array.isArray(skillGoals)) {
      for (const one of skillGoals) {
        if (one === goal) {
          output.push(skill);
        }
      }
    }

    find(skill, goal, output);
  }

  return output;
}
