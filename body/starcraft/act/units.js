import command from "./command.js";
import { ACTIONS } from "../units.js";

export default async function(client, units) {
  for (const unit of units) {
    const unitType = unit.get("type").label;

    if (unit.get("produce") && !unit.get("orders")) {
      await command(client, unit, ACTIONS[unitType][unit.get("produce").label]);
      unit.clear("produce");
      unit.set("orders", 1);
    } else if ((unitType === "nexus") && unit.get("set-rally-point")) {
      await command(client, unit, 3690, unit.get("set-rally-point"));
      unit.clear("set-rally-point");
    } else if ((unitType === "nexus") && unit.get("chronoboost")) {
      await command(client, unit, 3755, unit.get("chronoboost"));
      unit.clear("chronoboost");
    } else if ((unitType === "sentry") && unit.get("use-guardian-shield")) {
      await command(client, unit, 76);
      unit.clear("use-guardian-shield");
    } else if ((unitType === "mothership") && unit.get("time-warp")) {
      await command(client, unit, 2244, unit.get("time-warp"));
      unit.clear("time-warp");
    }
  }
}
