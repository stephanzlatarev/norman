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
      await doGoal(this, goal);
    }
  }

}

async function doGoal(controller, goal) {
  const goalStepTimeInMillis = new Date().getTime();

  if (goal.links().length === 0) {
    const skills = await controller.skill.find(goal.get("label"));

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const index = i + 1;
      skill.path = goal.path + "/" + index;
      goal.set("" + index, skill);
    }
  }

  if (goal.links().length > 0) {
    for (const subgoal of goal.links()) {
      const type = subgoal.get("type");

      if (type === "skill") {
        await doSkill(controller, goal, subgoal);
      } else if (type === "goal") {
        await doGoal(controller, subgoal);
      }
    }
  }

  goal.set("stepTimeInMillis", new Date().getTime() - goalStepTimeInMillis);
}

async function doSkill(controller, goal, skill) {
  const skillStepTimeInMillis = new Date().getTime();

  const bodyFilter = skill.get("body");
  await traverseBodies(controller.node.memory.get("body"), bodyFilter, async (body) => await controller.skill.perform(goal, skill, body));

  skill.set("stepTimeInMillis", new Date().getTime() - skillStepTimeInMillis);
}


async function traverseBodies(node, bodyFilter, op) {
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
      await traverseBodies(child, bodyFilter, op);
    }
  }
}
