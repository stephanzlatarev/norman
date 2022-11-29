import Skill from "./skill.js";

export default class Goal {

  constructor(node) {
    this.node = node;
    this.skill = new Skill(this.node.memory.get("skill"));
  }

  ok() {
    return true;
  }

  async tick() {
    // each goal will be achieved by one or more pairs of "body" and "skill"

    for (const goal of this.node.links()) {
      if (!goal.links().length) {
        const skills = await this.skill.find(goal.get("label"));

        for (let i = 0; i < skills.length; i++) {
          goal.set("" + (i + 1), skills[i]);
        }
      }

      for (const skill of goal.links()) {
        const bodyFilter = skill.get("body");
        await traverse(this.node.memory.get("body"), bodyFilter, async (body) => await this.skill.perform(skill, body));
      }
    }
  }

}

async function traverse(node, bodyFilter, op) {
  const body = node.get("body");

  if (body) {
    let isMatching = true;

    for (const key in bodyFilter) {
      if (node.get(key) !== bodyFilter[key]) {
        isMatching = false;
        break;
      }
    }

    if (isMatching) {
      await op(node, body);
    }
  }

  for (const child of node.links()) {
    if (child.path.startsWith(node.path + "/")) {
      await traverse(child, bodyFilter, op);
    }
  }
}
