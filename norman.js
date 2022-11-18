import fs from "fs";
import { memory } from "./body/nodejs/memory.js";

const print = console.log;
const env = JSON.parse(fs.readFileSync("./norman.env").toString());

const bodies = [];
const skills = [];
const skillNameToSkillMap = {};
const skillToBodyMap = {};
const skillMapping = {};

async function start() {
  console.log("Starting...");

  // Attach all bodies and skills
  for (const bodyName in env.skills) {
    const module = await import("./body/" + bodyName + "/body.js");
    const body = new module.default(env.config);

    body.name = bodyName;
    bodies.push(body);

    if (body.attach) {
      await body.attach();
    }

    console.log("Successfully attached body:", body.name);

    for (const skillName of env.skills[bodyName]) {
      skillToBodyMap[skillName] = body;
      skills.push(await getSkill(skillName, body));

      console.log("Successfully activated skill:", skillName);
    }
  }

  tick();
}

async function loadSkill(skillName) {
  const path = "./skill/" + skillName + "/";

  skillMapping[skillName] = JSON.parse(fs.readFileSync(path + "mapping.json"));

  if (fs.existsSync(path + "brain.js")) {
    const module = await import(path + "brain.js");
    return new module.default();
  }
}

async function getSkill(skillName) {
  let skill = skillNameToSkillMap[skillName];

  if (!skill) {
    skill = await loadSkill(skillName);

    if (skill) {
      skill.name = skillName;
      skillNameToSkillMap[skillName] = skill;
    }
  }

  return skill;
}

function mapSkillInput(skill) {
  const input = [];

  for (const m of skillMapping[skill.name].input) {
    const data = memory.get(m);

    if ((data !== null) && (data !== undefined)) {
      input.push(data);
    } else {
      return null;
    }
  }

  return input;
}

async function performSkill(skill, input) {
  const body = skillToBodyMap[skill.name];
  const command = skillMapping[skill.name].command;
  const sensor = input ? input : mapSkillInput(skill);
  const data = sensor ? await skill.react(sensor) : null;

  if (data && data.length) {
    if (command) {
      return await body.perform(command, data);
    } else {
      const subSkillName = skillMapping[skill.name].skills[data[0]];
      const subSkill = await getSkill(subSkillName);

      skillToBodyMap[subSkillName] = body;
      return await performSkill(subSkill, data);
    }
  }
}

async function tick() {
  // Make all bodies tick. They will read the changes in their situation
  for (const body of bodies) {
    if (body.tick) {
      await body.tick(memory);
    }
  }

  // Run all active skills
  for (const skill of skills) {
    // TODO: Fix this
    if (skill.name === "starcraft/probe") {
      while (await performSkill(skill));
    } else {
      await performSkill(skill);
    }
  }

  // Make all bodies tock. They will execute the performed actions
  for (const body of bodies) {
    if (body.tock) {
      await body.tock();
    }
  }

  if (bodies.length) {
    setTimeout(tick);
  }
}

async function stop() {
  if (bodies.length) {
    console.log("Stopping...");

    // Dettach all bodies
    for (const body of bodies) {
      if (body.dettach) {
        await body.dettach();
      }

      //TODO: Dettach the skills for this body

      console.log("Successfully dettached body:", body.name);
    }

    bodies.length = 0;

    console.log("Bye!");
  }
}

console.log = function() {
  print(`[${new Date().toISOString()}]`, ...arguments);
}

start().catch(error => { console.log("ERROR:", error.message); console.log(error); });

process.on('SIGINT', stop);
process.on('SIGQUIT', stop);
process.on('SIGTERM', stop);
