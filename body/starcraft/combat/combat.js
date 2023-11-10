import command from "./command.js";
import engage from "./engage.js";
import plan from "./plan.js";

const LOG = false;

export default class Combat {

  run(time, units) {
    if (!units.size) return [];

    const missions = plan(units);
    const commands = [];

    if (missions.length) {
      engage(units, missions);
      command(missions, commands);
    }

    if (LOG) log(time, units, missions, commands);

    return commands;
  }

}

function log(time, units, missions, commands) {
  const logs = [];

  logs.push("# Time " + time);

  for (const unit of units.values()) {
    logs.push(JSON.stringify(unit));
  }

  for (const mission of missions) {
    logs.push(JSON.stringify(mission.describe()));
  }

  for (const command of commands) {
    logs.push(JSON.stringify(command));
  }

  console.log(logs.join("\n"));
}
