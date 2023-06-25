import command from "./command.js";
import { ACTIONS } from "../units.js";

export default async function(model, client, units) {
  for (const unit of units) {

    if (fight(unit)) {
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

    const currentAbilityId = unit.get("orderAbilityId");

    const product = unit.get("produce");
    const location = unit.get("produceAt");

    if (product && location) {
      const action = ACTIONS.probe[product.label];
      let isPerformingTheAction = false;

      if (!action) {
        console.log("Unknown building for probe to build:", product.label);
        continue;
      }

      if (currentAbilityId === 299) {
        // We can't interrupt the probe while returning the harvest
        isPerformingTheAction = true;
      } else if (currentAbilityId !== action) {
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
        unit.clear("isProducer");
        unit.clear("produce");
        unit.clear("produceAt");
        unit.clear("produceUnitType");
      }

      continue;
    }

    const harvest = unit.get("harvest");

    if (harvest) {
      const currentTargetUnit = unit.get("orderTargetUnit");

      if (currentAbilityId === 299) {
        // The probe is returning the harvest. Don't stop it
      } else if ((currentAbilityId !== 298) || (currentTargetUnit !== harvest)) {
        if (isResourceDepleted(model, harvest)) {
          unit.clear("harvest");
          unit.clear("isVespeneHarvester");
          continue;
        }

        // Command the probe to harvest this mineral field or vespene gayser
        let isWorkingOnIt = await command(client, unit, 298, harvest);

        if (isWorkingOnIt && harvest.get("type:assimilator")) {
          unit.set("isVespeneHarvester", true);
        }
      }
    }
  }
}

// TODO: Move this to observe
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

// TODO: Make workers fight enemy units when not enough own warriors are nearby
function fight() {
//  const workers = model.observation.ownUnits.filter(unit => (WORKERS[unit.unitType] && near(unit, armyX, armyY, 20))).sort((a, b) => a.tag.localeCompare(b.tag));
//
//  if (workers.length) {
//    // Limit mobilized workers to 3 per enemy
//    let workersLimit = enemies.length * 3;
//
//    if (units.length) {
//      // Reduce mobilized workers when there are own warriors and when enemy uses light warriors
//      const lightEnemies = model.observation.enemyUnits.filter(isLightTarget);
//      workersLimit = Math.max((enemies.length * 2 - lightEnemies.length - units.length * 2 + 1) * 2, 0);
//    }
//    if (workers.length > workersLimit) {
//      workers.length = workersLimit;
//    }
//  }
//  for (const worker of workers) {
//    model.get(worker.tag).set("isMobilized", true);
//    units.push(worker);
//  }
  return false;
}
