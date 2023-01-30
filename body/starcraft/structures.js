
export function observeStructures(node, observation) {
  if (!node.get("homebase")) {
    const nexus = observation.rawData.units.find(unit => unit.unitType === 59);
    const homebase = node.memory.get(node.path + "/" + nexus.tag);

    node.set("homebase", homebase);
    homebase.set("homebase", true);
  }

  countStructuresOfNexuses(node, observation);
}

function countStructuresOfNexuses(node, observation) {
  for (const nexus of node.links()) {
    if (nexus.get("unitType") === "nexus") {
      const nexusX = nexus.get("x");
      const nexusY = nexus.get("y");
      const baseX = nexus.get("baseX");
      const baseY = nexus.get("baseY");

      const assimilators = observation.ownUnits.filter(assimilator => (assimilator.unitType === 61) && (assimilator.buildProgress >= 1) && near(assimilator, nexusX, nexusY));
      nexus.set("assimilators", assimilators.length);
      for (const assimilator of assimilators) {
        nexus.set(assimilator.tag, node.memory.get(node.path + "/" + assimilator.tag));
      }

      if (!baseX || !baseY) continue;

      nexus.set("baseNeedsPylon", !observation.ownUnits.find(pylon => (pylon.unitType === 60) && near(pylon, baseX, baseY)));

      const pylons = observation.ownUnits.filter(pylon => (pylon.unitType === 60) && (pylon.buildProgress >= 1) && near(pylon, baseX, baseY));
      nexus.set("pylons", pylons.length);

      const gateways = observation.ownUnits.filter(gateway => (gateway.unitType === 62) && (gateway.buildProgress >= 1) && near(gateway, baseX, baseY));
      nexus.set("gateways", gateways.length);
      for (const gateway of gateways) {
        nexus.set(gateway.tag, node.memory.get(node.path + "/" + gateway.tag));
      }

      const forges = observation.ownUnits.filter(structure => (structure.unitType === 63) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
      nexus.set("forges", forges.length);

      const beacons = observation.ownUnits.filter(structure => (structure.unitType === 64) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
      nexus.set("beacons", beacons.length);

      const stargates = observation.ownUnits.filter(structure => (structure.unitType === 67) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
      nexus.set("stargates", stargates.length);

      const robotics = observation.ownUnits.filter(structure => (structure.unitType === 71) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
      nexus.set("robotics", robotics.length);

      const cybernetics = observation.ownUnits.filter(structure => (structure.unitType === 72) && (structure.buildProgress >= 1) && near(structure, baseX, baseY));
      nexus.set("cybernetics", cybernetics.length);

      const structures = observation.ownUnits.filter(structure => (
        (structure.unitType === 62) || (structure.unitType === 63) || (structure.unitType === 64) || (structure.unitType === 67) ||
        (structure.unitType === 71) || (structure.unitType === 72)
      ) && near(structure, baseX, baseY));
      nexus.set("structures", structures.length);
    }
  }
}

function near(structure, x, y) {
  return (Math.abs(structure.pos.x - x) <= 10) && (Math.abs(structure.pos.y - y) <= 10);
}

export function linkNexusToCluster(nexus, cluster) {
  nexus.set("resources", cluster);
  nexus.set("baseX", cluster.get("baseX"));
  nexus.set("baseY", cluster.get("baseY"));
}
