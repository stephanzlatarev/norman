import { ACTIONS, ACTIONS_LABELS } from "../units.js";

export default async function(model, client, units) {
  for (const unit of units) {
    const unitType = unit.get("type").label;
    const activeOrderAbilityId = unit.get("orderAbilityId");

    if (unitType === "probe") {
      if (unit.get("isMobilized") || (activeOrderAbilityId === 16) || (activeOrderAbilityId === 23)) {
        unit.clear("isMobilized");

        const location = unit.get("produceAt");
        if (location) {
          if (!location.get("type")) {
            model.memory.remove(location);
          }

          unit.clear("isProducer");
          unit.clear("produce");
          unit.clear("produceAt");
          unit.clear("produceUnitType");
        }

        continue;
      }

      const product = unit.get("produce");
      const location = unit.get("produceAt");

      if (product && location) {
        const action = ACTIONS.probe[product.label];
        let isPerformingTheAction = false;

        if (!action) {
          console.log("Unknown building for probe to build:", product.label);
          continue;
        }

        if (activeOrderAbilityId === 299) {
          // We can't interrupt the probe while returning the harvest
          isPerformingTheAction = true;
        } else if (activeOrderAbilityId !== action) {
          const produceUnitTypeNode = unit.get("produceUnitType");
          const produceUnitType = produceUnitTypeNode ? produceUnitTypeNode.label : null;

          if (produceUnitType !== product.label) {
            isPerformingTheAction = await command(client, unit, action, location);

            if (isPerformingTheAction) {
              unit.set("produceUnitType", model.add(product.label));
            } else if (!location.get("type")) {
              model.memory.remove(location);
            }
          }
        } else {
          isPerformingTheAction = true;
        }

        if (!isPerformingTheAction) {
          unit.set("isProducer", false);
          unit.set("produce", false);
          unit.set("produceAt", false);
          unit.set("produceUnitType", false);
        }

        continue;
      }

      const harvest = unit.get("harvest");

      if (harvest) {
        const currentAbilityId = unit.get("orderAbilityId");
        const currentTargetUnit = unit.get("orderTargetUnit");

        if (currentAbilityId === 299) {
          // The probe is returning the harvest. Don't stop it
        } else if ((currentAbilityId !== 298) || (currentTargetUnit !== harvest)) {
          if (isResourceDepleted(model, harvest)) {
            unit.set("harvest", false);
            unit.set("isVespeneHarvester", false);
            continue;
          }

          // Command the probe to harvest this mineral field or vespene gayser
          let isWorkingOnIt = await command(client, unit, 298, harvest);

          if (isWorkingOnIt && harvest.get("type:assimilator")) {
            unit.set("isVespeneHarvester", true);
          }
        }
      }
    } else if (unitType === "nexus") {
      const rallyPoint = unit.get("set-rally-point");

      if (rallyPoint) {
        await command(client, unit, 3690, rallyPoint);
        unit.set("set-rally-point", false);
      }

      const chronoboostTarget = unit.get("chronoboost");

      if (chronoboostTarget) {
        await command(client, unit, 3755, chronoboostTarget);
        unit.set("chronoboost", false);
      }

      const product = unit.get("produce");

      if (product && !unit.get("orders")) {
        const action = ACTIONS.nexus[product.label];

        await command(client, unit, action);
        unit.set("produce", false);
        unit.set("orders", 1);
      }
    } else {
      const product = unit.get("produce");

      if (product && !unit.get("orders")) {
        const action = ACTIONS[unitType][product.label];

        await command(client, unit, action);
        unit.set("produce", false);
        unit.set("orders", 1);
      }

      if (await fight(model, client, unit)) continue;
      if (await scout(client, unit)) continue;
    }
  }
}

async function command(client, unit, ability, target) {
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

  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] === 1) {
    if ((command.abilityId !== 16) && (command.abilityId !== 298) && (command.abilityId !== 3674)) {
      log(command, unit);
    }

    return true;
  } else {
    log(command, unit);
    console.log(JSON.stringify(command), ">>", JSON.stringify(response));
    return false;
  }
}

function log(command, unit) {
  const unitType = unit.get("type").label;
  const target = "" + (command.targetUnitTag ? command.targetUnitTag : "") + (command.targetWorldSpacePos ? JSON.stringify(command.targetWorldSpacePos) : "");
  console.log(`${unitType} (${command.unitTags[0]}) ${ACTIONS_LABELS[command.abilityId]} (${command.abilityId}) ${target}`);
}

function isResourceDepleted(model, harvest) {
  const tag = String(harvest.get("tag"));

  if (harvest.get("type:assimilator")) {
    if (harvest.get("isDepleted")) {
      return true;
    }
  } else {
    if (!model.observation.rawData.units.find(unit => (unit.tag === tag))) {
      model.remove(harvest);
      return true;
    }
  }

  return false;
}

async function fight(model, client, unit) {
  if (unit.get("use-guardian-shield")) {
    await command(client, unit, 76);
    unit.clear("use-guardian-shield");
  } else if (unit.get("time-warp")) {
    await command(client, unit, 2244, unit.get("time-warp"));
    unit.clear("time-warp");
  }

  return (model.get("Army").get("mode") === 2);
}

async function scout(client, unit) {
  const location = unit.get("scout");

  if (!location) return false;

  const currentAbilityId = unit.get("orderAbilityId");

  // Check if scout is already there (currentAbilityId === 0 and coordinates are within 1 unit of distance)
  if ((currentAbilityId !== 16) && !isAtLocation(unit, location)) {
    await command(client, unit, 16, location);
    location.set("scout", unit);
  }

  return true;
}

function isAtLocation(unit, location) {
  if (Math.abs(unit.get("x") - location.get("x")) > 1) return false;
  if (Math.abs(unit.get("y") - location.get("y")) > 1) return false;
  return true;
}
