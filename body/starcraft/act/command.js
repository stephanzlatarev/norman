import { ACTIONS_LABELS } from "../units.js";

export default async function(client, unit, ability, target) {
  const unitTag = unit.get("tag");
  const command = {
    unitTags: [unitTag],
    abilityId: ability,
    queueCommand: false,
    targetUnitTag: undefined,
    targetWorldSpacePos: undefined,
  };

  if (target) {
    const targetUnitTag = target.get("tag");

    if (targetUnitTag) {
      command.targetUnitTag = targetUnitTag;
    } else {
      command.targetWorldSpacePos = { x: target.get("x"), y: target.get("y") };
    }
  }

  if ((command.abilityId !== 16) && (command.abilityId !== 298) && (command.abilityId !== 3674)) {
    log(command, unit);
  }

  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });

  if (response.result[0] === 1) {
    return true;
  } else {
    console.log(JSON.stringify(command), ">>", JSON.stringify(response));
    return false;
  }
}

function log(command, unit) {
  const unitType = unit.get("type").label;
  const target = "" + (command.targetUnitTag ? command.targetUnitTag : "") + (command.targetWorldSpacePos ? JSON.stringify(command.targetWorldSpacePos) : "");
  console.log(`${unitType} (${command.unitTags[0]}) ${ACTIONS_LABELS[command.abilityId]} (${command.abilityId}) ${target}`);
}
