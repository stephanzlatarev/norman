import { memory } from "../nodejs/memory.js";
import { findFreePlace } from "./grid.js";

export default {
  getAllResources: getAllResources,
  pickClosestFreeMineralField: pickClosestFreeMineralField,
  pickIdleProbe: pickIdleProbe,
  pickFreeLocationForPylon: pickFreeLocationForPylon,
  pickFreeLocationForNexus: pickFreeLocationForNexus,
  pickIdleNexus: pickIdleNexus,
  pickIdleGateway: pickIdleGateway,
  pickFreeLocationForGateway: pickFreeLocationForGateway,
  pickIdleZealot: pickIdleZealot,
  pickZealotLeader: pickZealotLeader,
  countArmy: countArmy,
};

const MINERALS = {
  146: 1, 147: 1, 341: 1, 483: 1,
  665: 1, 666: 1, 796: 1, 797: 1,
  884: 1, 885: 1, 886: 1, 887: 1,
};
const VESPENES = {
  342: 1, 343: 1, 344: 1, 608: 1, 880: 1, 881: 1,
};

function getAllResources(observation) {
  return observation.rawData.units.filter(unit => (MINERALS[unit.unitType] || VESPENES[unit.unitType]));
}

function getClosestMinerals(observation, owner, nexusTag) {
  const nexus = observation.rawData.units.find(unit => ((unit.owner === owner) && (unit.tag === (nexusTag ? nexusTag : memory.get("ref/0")))));
  const minerals = observation.rawData.units.filter(unit => MINERALS[unit.unitType]);

  minerals.sort((a, b) => {
    const da = (a.pos.x - nexus.pos.x) * (a.pos.x - nexus.pos.x) + (a.pos.y - nexus.pos.y) * (a.pos.y - nexus.pos.y);
    const db = (b.pos.x - nexus.pos.x) * (b.pos.x - nexus.pos.x) + (b.pos.y - nexus.pos.y) * (b.pos.y - nexus.pos.y);
    return da - db;
  });

  return minerals;
}

function pickClosestFreeMineralField(observation, owner) {
  const minerals = getClosestMinerals(observation, owner);

  for (const field of minerals) {
    const assignments = memory.get("assignments/" + field.tag);
    if (!assignments || (assignments.length < 2)) return field.tag;
  }
}

function pickIdleProbe(observation, owner) {
  const mode = memory.get("mode");
  const time = memory.get("time");
  const probes = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 84)));

  for (const probe of probes) {
    if (mode === "defend") {
      if (!memory.get("time/" + probe.tag) || (memory.get("time/" + probe.tag) < time)) {
        return probe.tag;
      } else {
        continue;
      }
    }

    const harvestedField = memory.get("assignments/" + probe.tag);

    // TODO: Check if mineral field is depleted

    if (harvestedField && !probe.orders.length) {
      // Free probe from previous assignment to harvest this mineral field
      memory.clear("assignments/" + probe.tag);

      // Make the mineral field available to other probes, including this probe
      let haresters = memory.get("assignments/" + harvestedField);
      if (haresters) {
        if ((haresters.length === 1) && (haresters[0] === probe.tag)) {
          haresters = null;
        } else if ((haresters.length === 2) && (haresters[0] === probe.tag)) {
          haresters = [haresters[1]];
        } else if ((haresters.length === 2) && (haresters[1] === probe.tag)) {
          haresters = [haresters[0]];
        }
      }
      memory.set("assignments/" + harvestedField, haresters);

      // The probe is idle
      return probe.tag;
    }

    if (!harvestedField || !probe.orders.length) {
      return probe.tag;
    }
  }
}

function pickIdleNexus(observation, owner) {
  const nexuses = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 59)));

  for (const nexus of nexuses) {
    if (!nexus.orders.length) return nexus.tag;
  }
}

function pickIdleGateway(observation, owner) {
  const gateways = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 62)));

  for (const gateway of gateways) {
    if (!gateway.orders.length) return gateway.tag;
  }
}

function pickIdleZealot(observation, owner) {
  const mode = memory.get("mode");
  const zealots = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 73)));

  for (const zealot of zealots) {
    if (!zealot.orders.length) return zealot.tag;
    if (memory.get("mode/" + zealot.tag) !== mode) return zealot.tag;
  }
}

function pickFreeLocationForPylon(observation, owner) {
  const nexuses = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 59)));
  const pylons = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 60)));

  // Sort Nexuses by least pylons
  const pylonsPerNexus = {};
  for (const nexus of nexuses) pylonsPerNexus[nexus.tag] = countPylonsNearNexus(nexus, pylons);

  nexuses.sort(function(a, b) {
    return (pylonsPerNexus[a.tag] !== pylonsPerNexus[b.tag]) ? (pylonsPerNexus[a.tag] - pylonsPerNexus[b.tag]) : a.tag.localeCompare(b.tag);
  });

  // Find empty spot
  for (const nexus of nexuses) {
    const face = getNexusFace(nexus, observation);
  
    for (const i of [0, 2.5, -2.5, 5, -5]) {
      const location = { x: nexus.pos.x + face.side.x * 4 + face.vector.x * i, y: nexus.pos.y + face.side.y * 4 + face.vector.y * i };
  
      if (!isClose({ pos: location }, 1, pylons)) {
        return location;
      }
    }
  }
}

function getNexusFace(nexus, observation) {
  const memoryKey = "nexus." + nexus.tag + ".face";
  if (memory.get(memoryKey)) return memory.get(memoryKey);

  const resources = observation.rawData.units.filter(function(unit) {
    if (!MINERALS[unit.unitType] && !VESPENES[unit.unitType]) return false;
    if ((Math.abs(unit.pos.x - nexus.pos.x) < 15) && (Math.abs(unit.pos.y - nexus.pos.y) < 15)) return false;
    return true;
  });

  let ups = 0;
  let downs = 0;
  let lefts = 0;
  let rights = 0;

  for (const resource of resources) {
    if (resource.pos.y >= nexus.pos.y) {
      ups++;
    } else {
      downs++;
    }
    if (resource.pos.x >= nexus.pos.x) {
      rights++;
    } else {
      lefts++;
    }
  }

  let face;
  if ((rights >= lefts) && (rights >= ups) && (rights >= downs)) {
    face = { side: { x: 1, y: 0 }, vector: { x: 0, y: 1 } };
  } else if ((lefts >= ups) && (lefts >= downs)) {
    face = { side: { x: -1, y: 0 }, vector: { x: 0, y: 1 } };
  } else if (ups >= downs) {
    face = { side: { x: 0, y: 1 }, vector: { x: 1, y: 0 } };
  } else {
    face = { side: { x: 0, y: -1 }, vector: { x: 1, y: 0 } };
  }

  memory.set(memoryKey, face);

  return face;
}

function countPylonsNearNexus(nexus, pylons) {
  let count = 0;

  for (const pylon of pylons) {
    if ((Math.abs(pylon.pos.x - nexus.pos.x) < 10) && (Math.abs(pylon.pos.y - nexus.pos.y) < 10)) {
      count++;
    }
  }

  return count;
}

function getClosestResources(observation, nexus) {
  const minerals = observation.rawData.units.filter(unit => (MINERALS[unit.unitType] || VESPENES[unit.unitType]));

  minerals.sort((a, b) => {
    const da = (a.pos.x - nexus.pos.x) * (a.pos.x - nexus.pos.x) + (a.pos.y - nexus.pos.y) * (a.pos.y - nexus.pos.y);
    const db = (b.pos.x - nexus.pos.x) * (b.pos.x - nexus.pos.x) + (b.pos.y - nexus.pos.y) * (b.pos.y - nexus.pos.y);
    return da - db;
  });

  return minerals;
}

function pickFreeLocationForNexus(observation, owner) {
  const nexuses = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 59)));

  if (memory.get("expansion.x") && memory.get("expansion.y")) {
    const location = { x: memory.get("expansion.x"), y: memory.get("expansion.y") };
    if (!isClose({ pos: location }, 5, nexuses)) {
      return location;
    }
  }

  nexuses.sort((a, b) => a.tag.localeCompare(b.tag));

  const base = nexuses[0];
  const resources = getClosestResources(observation, base);

  // Find a resource of an un-occupied cluster
  let anchor;
  for (const field of resources) {
    if (!isClose(field, 16, nexuses)) {
      anchor = field;
      break;
    }
  }

  const fields = findClusterOfResources(anchor, resources);
  const location = findFreePlace(base.radius + 2.5, fields);

  memory.set("expansion.x", location.x);
  memory.set("expansion.y", location.y);

  return location;
}

function findClusterOfResources(anchor, resources) {
  const cluster = [anchor];
  const additions = [];

  do {
    additions.length = 0;

    for (const field of cluster) {
      for (const add of findCloseResources(field, resources)) {
        if (cluster.indexOf(add) >= 0) continue;
        if (additions.indexOf(add) >= 0) continue;
        additions.push(add);
      }
    }

    for (const field of additions) cluster.push(field);
  } while (additions.length);

  return cluster;
}

function findCloseResources(field, resources) {
  const list = [];

  for (const resource of resources) {
    if (isClose(resource, 5, [field])) {
      list.push(resource);
    }
  }

  return list;
}

function pickFreeLocationForGateway(observation, owner) {
  const nexuses = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 59)));
  const gateways = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 62)));

  // Sort Nexuses by least gateways
  const gatewaysPerNexus = {};
  for (const nexus of nexuses) gatewaysPerNexus[nexus.tag] = countGatewaysNearNexus(nexus, gateways);

  nexuses.sort(function(a, b) {
    return (gatewaysPerNexus[a.tag] !== gatewaysPerNexus[b.tag]) ? (gatewaysPerNexus[a.tag] - gatewaysPerNexus[b.tag]) : a.tag.localeCompare(b.tag);
  });

  // Find empty spot
  for (const nexus of nexuses) {
    const face = getNexusFace(nexus, observation);
  
    for (const i of [2.5, -2.5]) {
      const location = { x: nexus.pos.x + face.side.x * 8 + face.vector.x * i, y: nexus.pos.y + face.side.y * 8 + face.vector.y * i };
  
      if (!isClose({ pos: location }, 1, gateways)) {
        return location;
      }
    }
  }
}

function countGatewaysNearNexus(nexus, gateways) {
  let count = 0;

  for (const gateway of gateways) {
    if ((Math.abs(gateway.pos.x - nexus.pos.x) < 10) && (Math.abs(gateway.pos.y - nexus.pos.y) < 10)) {
      count++;
    }
  }

  return count;
}

function countArmy(observation, owner) {
  const zealots = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 73)));
  const rallyPoint = [{ pos: { x: memory.get("rally.x"), y: memory.get("rally.y") } }];

  let count = 0;

  for (const zealot of zealots) {
    if (isClose(zealot, 10, rallyPoint) || isFighting(zealot)) count++;
  }

  return count;
}

function isClose(subject, distance, objects) {
  for (const object of objects) {
    if ((Math.abs(object.pos.x - subject.pos.x) < distance) && (Math.abs(object.pos.y - subject.pos.y) < distance)) {
      return true;
    }
  }

  return false;
}

function isFighting(zealot) {
  if (!zealot.orders.length) return false;

  const ability = zealot.orders[0].abilityId;
  return ((ability === 3674) || (ability === 23) || (ability === 2048));
}

function pickZealotLeader(observation, owner) {
  const nexus = observation.rawData.units.find(unit => (unit.tag === memory.get("ref/0")));
  const zealots = observation.rawData.units.filter(unit => ((unit.owner === owner) && (unit.unitType === 73)));
  zealots.sort((a, b) => {
    const da = (a.pos.x - nexus.pos.x) * (a.pos.x - nexus.pos.x) + (a.pos.y - nexus.pos.y) * (a.pos.y - nexus.pos.y);
    const db = (b.pos.x - nexus.pos.x) * (b.pos.x - nexus.pos.x) + (b.pos.y - nexus.pos.y) * (b.pos.y - nexus.pos.y);
    return da - db;
  });
  return zealots.length ? zealots[Math.floor(zealots.length / 2)] : null;
}
