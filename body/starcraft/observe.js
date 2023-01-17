import { observeResources } from "./resources.js";
import { observeStructures } from "./structures.js";
import { observeMilitary } from "./military.js";

const UNITS = {
  59: "nexus",
  60: "pylon",
  62: "gateway",
  73: "zealot",
  84: "probe"
};

export default async function(node, client) {
  const observation = (await client.observation()).observation;
  const owner = await observePlayers(node, client, observation);

  observation.ownUnits = observation.rawData.units.filter(unit => unit.owner === owner);

  node.set("time", observation.gameLoop);
  node.set("minerals", observation.playerCommon.minerals);
  node.set("foodUsed", observation.playerCommon.foodUsed);
  node.set("foodCap", observation.playerCommon.foodCap);

  observeChat(node, client);
  observeResources(node, observation);
  observeStructures(node, observation);
  observeUnits(node, client, observation.ownUnits);
  removeDeadUnits(node, observation);
  observeMilitary(node, client, observation);

  if (!node.get("homebase")) {
    node.set("over", true);
  }
}

async function observePlayers(node, client, observation) {
  if (!node.get("owner")) {
    const gameInfo = await client.gameInfo();

    const owner = observation.rawData.units.find(unit => unit.unitType === 59).owner;
    node.set("owner", owner);

    for (const player of gameInfo.playerInfo) {
      if (owner !== player.playerId) {
        node.set("enemy", player.playerId);
        break;
      }
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

function observeUnits(node, client, units) {
  const count = {
    nexus: 0, nexusBuilding: 0,
    pylon: 0, pylonBuilding: 0,
    gateway: 0, gatewayBuilding: 0,
  };

  for (const unitInReality of units) {
    const unitType = UNITS[unitInReality.unitType];
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
      unitInMemory.set("orderAbilityId", unitInReality.orders[0].abilityId);
      unitInMemory.set("orderTargetUnitTag", unitInReality.orders[0].targetUnitTag);

      if (unitInReality.orders[0].abilityId === 880) {
        count["nexusBuilding"]++;
      }
      if (unitInReality.orders[0].abilityId === 881) {
        count["pylonBuilding"]++;
      }
      if (unitInReality.orders[0].abilityId === 883) {
        count["gatewayBuilding"]++;
      }
    }

    unitInMemory.set("x", unitInReality.pos.x);
    unitInMemory.set("y", unitInReality.pos.y);

    const statType = unitType + ((unitInReality.buildProgress < 1) ? "Building" : "");
    count[statType] = count[statType] ? count[statType] + 1 : 1;
  }

  const stats = node.memory.get(node.path + "/stats");
  for (const unitType in count) {
    stats.set(unitType, count[unitType]);
  }
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
  return !!observation.rawData.units.find(unit => unit.tag === tag);
}
