
export function observeStructures(node, observation) {
  if (!node.get("homebase")) {
    const nexus = observation.rawData.units.find(unit => unit.unitType === 59);
    const homebase = node.memory.get(node.path + "/" + nexus.tag);
    const homeX = nexus.pos.x;
    const homeY = nexus.pos.y;

    node.set("homebase", homebase);
    homebase.set("homebase", true);
    homebase.set("x", homeX);
    homebase.set("y", homeY);

    const bases = node.memory.get(node.path + "/map/bases");
    for (const base of bases.links()) {
      const baseX = base.get("x");
      const baseY = base.get("y");
      base.set("distance", Math.sqrt((homeX - baseX) * (homeX - baseX) + (homeY - baseY) * (homeY - baseY)));
    }
  }

  const bases = node.memory.get(node.path + "/map/bases");
  countStructuresOfBases(node, bases, observation);
}

function countStructuresOfBases(node, bases, observation) {
  let baseCount = 0;
  let baseSlots = 0;

  for (const base of bases.links()) {
    const baseX = base.get("x");
    const baseY = base.get("y");

    const pylons = observation.ownUnits.filter(pylon => (pylon.unitType === 60) && (pylon.buildProgress >= 1) && near(pylon, baseX, baseY));
    base.set("pylons", pylons.length);
    base.set("powered", !!pylons.length);
    if (pylons.length) baseCount++;

    const gateways = observation.ownUnits.filter(gateway => (gateway.unitType === 62) && (gateway.buildProgress >= 1) && near(gateway, baseX, baseY));
    base.set("gateways", gateways.length);
    for (const gateway of gateways) {
      base.set(gateway.tag, node.memory.get(node.path + "/" + gateway.tag));
    }

    const forges = observation.ownUnits.filter(structure => (structure.unitType === 63) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
    base.set("forges", forges.length);

    const beacons = observation.ownUnits.filter(structure => (structure.unitType === 64) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
    base.set("beacons", beacons.length);

    const stargates = observation.ownUnits.filter(structure => (structure.unitType === 67) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
    base.set("stargates", stargates.length);

    const robotics = observation.ownUnits.filter(structure => (structure.unitType === 71) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
    base.set("robotics", robotics.length);

    const cybernetics = observation.ownUnits.filter(structure => (structure.unitType === 72) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
    base.set("cybernetics", cybernetics.length);

    const structures = observation.ownUnits.filter(structure => (
      (structure.unitType === 62) || (structure.unitType === 63) || (structure.unitType === 64) || (structure.unitType === 67) ||
      (structure.unitType === 71) || (structure.unitType === 72)
    ) && near(structure, baseX, baseY));
    base.set("structures", structures.length);

    if (pylons.length) {
      baseSlots = Math.max(4 - structures.length, 0);
    }
  }

  const stats = node.memory.get(node.path + "/stats");
  stats.set("base", baseCount);
  stats.set("baseBuilding", (baseSlots < 2) ? 1 : 0);
  stats.set("baseOrdered", 0);
}

function near(structure, x, y) {
  return (Math.abs(structure.pos.x - x) <= 3) && (Math.abs(structure.pos.y - y) <= 3);
}

export function linkNexusToCluster(nexus, cluster) {
  nexus.set("resources", cluster);
}
