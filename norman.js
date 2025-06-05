import fs from "fs";
import path from "path";
import Body from "./code/body.js";
import Skill from "./code/skill.js";

const print = console.log;

console.log = function() {
  print(`[${new Date().toISOString()}]`, ...arguments);
}

const env = JSON.parse(fs.readFileSync("./norman.env").toString());
const bodies = [];
const skills = [];

async function run() {
  try {
    await start();

    let running = true;

    while (running) {
      running = false;

      for (const body of bodies) {
        if (body.isAttached) {
          await body.observe();
        }
      }

      for (const skill of skills) {
        await skill.run();
      }

      for (const body of bodies) {
        if (body.isAttached) {
          running = true;

          await body.act();
        }
      }
    }
  } catch (error) {
    console.log("ERROR:", error.message);
    console.log(error);
  } finally {
    await stop();
  }
}

async function start() {
  console.log("Hi!");

  await readBodies(bodies, env);
  await readSkills(skills, path.resolve("skill"));

  for (const body of bodies) {
    await body.attach();
  }
}

async function stop() {
  for (const body of bodies) {
    await body.detach();
  }

  console.log("Bye!");

  process.exit(0);
}

async function readBodies(bodies, env) {
  for (const one of env.body) {
    if (one.label && one.code) {
      bodies.push(new Body(one.label, one.code, one.config));
    }
  }
}

async function readSkills(skills, dirpath) {
  const files = fs.readdirSync(dirpath, { withFileTypes: true });

  for (const file of files) {
    const filepath = path.resolve(dirpath, file.name);

    if (file.isDirectory()) {
      await readSkills(skills, filepath);
    } else if (file.isFile() && file.name.endsWith(".skill")) {
      const skill = await Skill.create(filepath);

      if (skill) {
        skills.push(skill);
      }
    }
  }
}

run();

process.on('SIGINT', async () => await stop());
process.on('SIGQUIT', async () => await stop());
process.on('SIGTERM', async () => await stop());
