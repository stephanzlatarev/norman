
export function observeStructures(node, observation) {
  countStructuresOfNexuses(node, observation);
}

function countStructuresOfNexuses(node, observation) {
  for (const nexus of node.links()) {
    if (nexus.get("unitType") === "nexus") {
      const x = nexus.get("x");
      const y = nexus.get("y");

      const pylons = observation.rawData.units.filter(pylon => (pylon.unitType === 60) && (pylon.buildProgress >= 1) && near(pylon, x, y));
      nexus.set("pylons", pylons.length);

      const gateways = observation.rawData.units.filter(gateway => (gateway.unitType === 62) && (gateway.buildProgress >= 1) && near(gateway, x, y));
      nexus.set("gateways", gateways.length);
      for (const gateway of gateways) {
        nexus.set(gateway.tag, node.memory.get(node.path + "/" + gateway.tag));
      }
    }
  }
}

function near(structure, x, y) {
  return (Math.abs(structure.pos.x - x) <= 10) && (Math.abs(structure.pos.y - y) <= 10);
}

export function linkNexusToCluster(nexus, cluster) {
  nexus.set("resources", cluster);

  const a = angle(nexus.get("x") - cluster.get("x"), nexus.get("y") - cluster.get("y"));
  nexus.set("faceSector", a[0]);
  nexus.set("faceSide", a[1]);
}

function angle(dx, dy) {
  if (!dx && !dy) return [0, 0];

  const d = (Math.abs((Math.abs(dx) - Math.abs(dy)) / (Math.abs(dx) + Math.abs(dy))) > 0.4142) ? 1 : -1;

  let a = 0;
  if ((dx >= 0) && (dy >= 0)) {
    a = (dx > dy) ? 1 : 0;
  } else if ((dx >= 0) && (dy < 0)) {
    a = (dx > -dy) ? 2 : 3;
  } else if ((dx < 0) && (dy < 0)) {
    a = (-dx > -dy) ? 5 : 4;
  } else if ((dx < 0) && (dy >= 0)) {
    a = (-dx > dy) ? 6 : 7;
  }

  return [a, d];
}
