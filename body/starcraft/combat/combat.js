import command from "./command.js";
import engage from "./engage.js";
import plan from "./plan.js";

const LOG = false;

export default class Combat {

  async run(time, units, plans) {
    if (!units.size) return [];

    const missions = plan(units, plans);
    const commands = [];

    if (missions.length) {
      engage(units, missions);
      await command(missions, commands, units);
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
