
const UNITS = {
  59: "nexus",
  84: "probe"
};
const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

export default async function(node, client) {
  const observation = (await client.observation()).observation;

  node.set("time", observation.gameLoop);
  node.set("minerals", observation.playerCommon.minerals);
  node.set("foodUsed", observation.playerCommon.foodUsed);
  node.set("foodCap", observation.playerCommon.foodCap);

  const nexus = observation.rawData.units.find(unit => unit.unitType === 59);

  observeChat(node, client);
  observeResources(node, observation.rawData.units, nexus);
  observeUnits(node, client, observation.rawData.units);

  if (!nexus) {
    node.set("over", true);
  }
}

function observeChat(node, client) {
  const chat = node.memory.get(node.path + "/chat");

  if (!chat.get("code")) {
    chat.set("code", "body/starcraft/chat").set("channel", client).set("game", node);
  }
}

function observeResources(node, resources, nexus) {
  const nexusInMemory = node.memory.get(node.path + "/" + nexus.tag);

  for (const resourceInReality of resources) {
    const unitType = RESOURCES[resourceInReality.unitType];
    if (!unitType) continue;

    const resourceInMemory = node.memory.get(node.path + "/" + resourceInReality.tag);
    if (!resourceInMemory.get("unitType")) {
      resourceInMemory.set("unitType", unitType).set("tag", resourceInReality.tag)
      .set("x", resourceInReality.pos.x).set("y", resourceInReality.pos.y);

      if ((Math.abs(resourceInReality.pos.x - nexus.pos.x) <= 10) && (Math.abs(resourceInReality.pos.y - nexus.pos.y) <= 10)) {
        resourceInMemory.set("nexus", nexusInMemory);
      }
    }
  }
}

function observeUnits(node, client, units) {
  for (const unitInReality of units) {
    const unitType = UNITS[unitInReality.unitType];
    if (!unitType) continue;

    const unitInMemory = node.memory.get(node.path + "/" + unitInReality.tag);
    if (!unitInMemory.get("code")) {
      unitInMemory.set("code", "body/starcraft/unit/" + unitType)
      .set("unitType", unitType).set("tag", unitInReality.tag)
      .set("channel", client).set("game", node);
    }

    unitInMemory.set("energy", unitInReality.energy);

    unitInMemory.set("orders", unitInReality.orders.length);
    if (unitInReality.orders.length) {
      unitInMemory.set("orderAbilityId", unitInReality.orders[0].abilityId);
      unitInMemory.set("orderTargetUnitTag", unitInReality.orders[0].targetUnitTag);
    }

    unitInMemory.set("x", unitInReality.pos.x);
    unitInMemory.set("y", unitInReality.pos.y);
  }
}
