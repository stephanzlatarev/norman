import { observeResources } from "./resources.js";
import { observeStructures } from "./structures.js";
import { observeMilitary } from "./military.js";
import { applyStrategy } from "./strategy.js";
import { BOOSTABLE, ENEMY_UNITS, EXPLORERS, ORDERS, OWN_UNITS } from "./units.js";

export default async function(node, client) {
  const observation = (await client.observation()).observation;
  const owner = await observePlayers(node, client, observation);

  if (!observation.rawData.units.find(unit => (unit.owner === owner) && (unit.unitType === 59))) {
    node.set("over", true);
    return;
  }

  observation.ownUnits = observation.rawData.units.filter(unit => unit.owner === owner);

  node.set("time", observation.gameLoop);
  node.set("minerals", observation.playerCommon.minerals);
  node.set("vespene", observation.playerCommon.vespene);
  node.set("foodUsed", observation.playerCommon.foodUsed);
  node.set("foodCap", observation.playerCommon.foodCap);

  await observeResources(node, client, observation);
  await applyStrategy(node, client, observation);

  observeChat(node, client);
  observeStructures(node, observation);
  observeUnits(node, client, observation);
  removeDeadUnits(node, observation);
  observeEnemyUnits(node, observation);
  observeMilitary(node, client, observation);
}

async function observePlayers(node, client, observation) {
  if (node.get("owner") !== observation.playerCommon.playerId) {
    const owner = observation.playerCommon.playerId;
    node.set("owner", owner);

    const gameInfo = await client.gameInfo();
    for (const player of gameInfo.playerInfo) {
      if (owner !== player.playerId) {
        node.set("enemy", player.playerId);
        break;
      }
    }
    if (gameInfo.startRaw && gameInfo.startRaw.startLocations && gameInfo.startRaw.startLocations.length) {
      const enemyBase = gameInfo.startRaw.startLocations[0];
      node.set("enemyBaseX", enemyBase.x);
      node.set("enemyBaseY", enemyBase.y);
    }

    return owner;
  }

  return node.get("owner");
}

function observeChat(node, client) {
  const chat = node.memory.get(node.path + "/chat");

  if (!chat.get("code")) {
    chat.set("code", "body/starcraft/chat").set("channel", client).set("game", node);
  }
}

function observeUnits(node, client, observation) {
  const units = observation.ownUnits;

  const complete = {
    groundWeapons: getUpgradeLevel(observation, 39, 40, 41),
    groundArmor: getUpgradeLevel(observation, 42, 43, 44),
    shields: getUpgradeLevel(observation, 45, 46, 47),
    airWeapons: getUpgradeLevel(observation, 78, 79, 80),
    airArmor: getUpgradeLevel(observation, 81, 82, 83),
  };
  for (const unit in OWN_UNITS) complete[OWN_UNITS[unit]] = 0;

  const progress = {};
  const ordered = {};
  for (const unit in ORDERS) {
    progress[ORDERS[unit]] = 0;
    ordered[ORDERS[unit]] = 0;
  }

  const buildingLocation = {};

  for (const unitInReality of units) {
    const unitType = OWN_UNITS[unitInReality.unitType];
    if (!unitType || !unitInReality.buildProgress) continue;

    const unitInMemory = node.memory.get(node.path + "/" + unitInReality.tag);
    if (!unitInMemory.get("code")) {
      unitInMemory.set("code", "body/starcraft/unit/" + unitType)
      .set("unitType", unitType).set("tag", unitInReality.tag)
      .set("channel", client).set("game", node);
    }

    unitInMemory.set("operational", unitInReality.buildProgress >= 1);
    unitInMemory.set("energy", unitInReality.energy);

    unitInMemory.set("orders", unitInReality.orders);
    unitInMemory.set("ordersCount", unitInReality.orders.length);
    if (unitInReality.orders.length) {
      const order = unitInReality.orders[0];
      unitInMemory.set("orderAbilityId", order.abilityId);
      unitInMemory.set("orderTargetUnitTag", order.targetUnitTag);

      const orderType = ORDERS[order.abilityId];
      if (orderType) {
        if (unitType === "probe") {
          if (addUniqueBuildingLocation(buildingLocation, orderType, getOrderLocation(observation, order))) {
            ordered[orderType]++;
          }
        } else {
          progress[orderType]++;
        }
      }
    } else {
      unitInMemory.clear("orderAbilityId");
      unitInMemory.clear("orderTargetUnitTag");
    }

    if (unitType === "assimilator") {
      unitInMemory.set("harvesters", unitInReality.assignedHarvesters);

      if (unitInReality.vespeneContents) {
        unitInMemory.set("utilized", (unitInReality.assignedHarvesters >= unitInReality.idealHarvesters));
      } else {
        abandonAssimilator(node, unitInMemory);
        unitInMemory.set("utilized", true);
      }
    }

    if (unitType === "sentry") {
      unitInMemory.set("guardian-shield", !!unitInReality.buffIds.length);
    }

    if (BOOSTABLE[unitInReality.unitType]) {
      unitInMemory.set("boostable", true);
      unitInMemory.set("boost", getBoostPercentage(unitInReality));
    }

    if (EXPLORERS[unitInReality.unitType]) {
      unitInMemory.set("explorer", true);
    }

    unitInMemory.set("x", unitInReality.pos.x);
    unitInMemory.set("y", unitInReality.pos.y);

    if (unitInReality.buildProgress < 1) {
      if (!addUniqueBuildingLocation(buildingLocation, unitType, unitInReality.pos)) {
        ordered[unitType]--;
      }
      progress[unitType]++;
    } else {
      complete[unitType]++;
    }
  }

  const stats = node.memory.get(node.path + "/stats");
  for (const unit in complete) {
    stats.set(unit, complete[unit]);
  }
  for (const unit in progress) {
    stats.set(unit + "Building", progress[unit]);
  }
  for (const unit in ordered) {
    stats.set(unit + "Ordered", ordered[unit]);
  }

  stats.set("probe", observation.playerCommon.foodWorkers);
}


function observeEnemyUnits(node, observation) {
  const count = {};
  for (const type in ENEMY_UNITS) {
    count[type] = 0;
  }

  for (const unit of observation.rawData.units) {
    if (ENEMY_UNITS[unit.unitType]) count[unit.unitType]++;
  }

  const stats = node.memory.get(node.path + "/statsEnemy");
  for (const type in ENEMY_UNITS) {
    stats.set(ENEMY_UNITS[type], count[type]);
  }
}

function getOrderLocation(observation, order) {
  if (order.targetWorldSpacePos) {
    return order.targetWorldSpacePos;
  } else if (order.targetUnitTag) {
    const unit = observation.rawData.units.find(unit => unit.tag === order.targetUnitTag);
    return unit ? unit.pos : null;
  }
}

function addUniqueBuildingLocation(locations, type, pos) {
  if (!pos) return true;
  if (!locations[type]) locations[type] = [];

  let isDuplicate = false;
  for (const location of locations[type]) {
    if ((Math.abs(pos.x - location.x) <= 1) && (Math.abs(pos.y - location.y) <= 1)) {
      isDuplicate = true;
      break;
    }
  }

  if (!isDuplicate) locations[type].push(pos);

  return !isDuplicate;
}

function removeDeadUnits(node, observation) {
  for (const unitInMemory of node.links()) {
    if (isUnitObserved(unitInMemory) && !isUnitPresent(observation, unitInMemory)) {
      unitInMemory.remove();
    }
  }
}

function isUnitObserved(unitInMemory) {
  return typeof(unitInMemory.get("tag")) === "string";
}

function isUnitPresent(observation, unitInMemory) {
  const tag = unitInMemory.get("tag");

  const assimilator = unitInMemory.get("harvest");
  const unitMayBeInAssimilator = assimilator ? (assimilator.get("unitType") === "assimilator") : false;

  return unitMayBeInAssimilator || !!observation.rawData.units.find(unit => unit.tag === tag);
}

function getUpgradeLevel(observation, level1, level2, level3) {
  const levels = observation.rawData.player.upgradeIds;
  if (levels.indexOf(level3) >= 0) return 3;
  if (levels.indexOf(level2) >= 0) return 2;
  if (levels.indexOf(level1) >= 0) return 1;
  return 0;
}

function getBoostPercentage(unit) {
  if (unit.buffDurationMax && unit.buffIds.length && (unit.buffIds[0] === 281)) {
    return unit.buffDurationRemain * 100 / unit.buffDurationMax; 
  }

  return 0;
}

function abandonAssimilator(game, assimilator) {
  if (!assimilator.get("abandoned")) {
    for (const probe of game.links()) {
      if (probe.get("harvest") === assimilator) {
        probe.clear("harvest");
        probe.clear("busy");
      }
    }

    assimilator.set("abandoned", true);
  }
}
