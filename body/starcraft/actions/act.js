import chat from "./chat.js";
import fight from "./army.js";
import { goHarvest, setupHarvest } from "./workers.js";
import { ACTIONS, ACTION_TARGET, ORDERS } from "../units.js";

let isSetupDone = false;

export default async function(node, client) {
  if (!isSetupDone && setupHarvest(node)) isSetupDone = true;

  await chat(node.memory.get(node.path + "/chat"), client);

  const army = node.get("army");

  for (const unit of node.links()) {
    const unitType = unit.get("unitType");

    if (unitType && ACTIONS[unitType] && canDoAction(unit, unitType, army)) {
      const unitTag = unit.get("tag");

      for (const action in ACTIONS[unitType]) {
        const target = unit.get(action);
        if (target) {
          if (await command(client, unitTag, unitType, action, target)) {
            const abilityId = ACTIONS[unitType][action];
            if (abilityId && ORDERS[abilityId]) {
              unit.set("pending", ORDERS[abilityId]);
            }

            unit.set("busy", true);
          }

          unit.clear(action);
          break;
        }
      }
    }

    if (unitType === "probe") {
      await goHarvest(unit, client);
    }
  }

  await fight(army, client);
}

function canDoAction(unit, unitType, army) {
  if (unitType === "probe") {
    if (unit.get("mobilized")) {
      unit.clear("mobilized");
      return false;
    }

    if (army && (army.get("mobilizeWorkers") > 0) && army.get("attack")) {
      return false;
    }
  }

  return true;
}

async function command(client, unitTag, unitType, action, target) {
  const command = {
    unitTags: [unitTag],
    abilityId: ACTIONS[unitType][action],
    queueCommand: false,
    targetUnitTag: undefined,
    targetWorldSpacePos: undefined,
  };

  if (ACTION_TARGET[action] === "location") {
    command.targetWorldSpacePos = { x: target.get("x"), y: target.get("y") };
  } else if (ACTION_TARGET[action] === "unit") {
    command.targetUnitTag = target.get("tag");
  }

  // TODO: Check if command was already issued. It may have been slightly different but effectively the same (e.g. move within radius 1). Don't repeat it.

  log(command, unitType, action);

  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] === 1) {
    return true;
  } else {
    console.log(JSON.stringify(command), ">>", JSON.stringify(response));
    return false;
  }
}

function log(command, unitType, action) {
  const target = "" + (command.targetUnitTag ? command.targetUnitTag : "") + (command.targetWorldSpacePos ? JSON.stringify(command.targetWorldSpacePos) : "");
  console.log(`${unitType} (${command.unitTags[0]}) ${action} (${command.abilityId}) ${target}`);
}
