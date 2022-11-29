import fs from "fs";
import Body from "./body/body.js";
import Goal from "./body/goal.js";
import Memory from "./body/memory.js";

const print = console.log;

console.log = function() {
  print(`[${new Date().toISOString()}]`, ...arguments);
}

const env = JSON.parse(fs.readFileSync("./norman.env").toString());

const memory = new Memory(env);
const goal = new Goal(memory.get("goal"));
const body = new Body(memory.get("body"));

async function go() {
  while (goal.ok() && body.ok()) {

    // Bodies should now read the changes in their situation
    await body.tick();

    // Run all skills towards the goals
    await goal.tick();

    // Bodies should now execute the performed actions
    await body.tock();

    // Give space for asynchronous operations
    await new Promise(r => setTimeout(r));
  }

  console.log("Bye!");
}

function stop() {
  console.log("Stopping...");

  if (body.ok()) {
    body.detach();
  }
}

go().catch(error => { console.log("ERROR:", error.message); console.log(error); });

process.on('SIGINT', stop);
process.on('SIGQUIT', stop);
process.on('SIGTERM', stop);
