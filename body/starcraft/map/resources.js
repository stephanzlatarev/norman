import Map from "./map.js";
import { mapClusterResources, mapHarvest } from "./harvest.js";

export function mapResources(model, gameInfo, observation) {
  const map = new Map(gameInfo, observation);

  mapGrid(model, map);
  mapBases(model, map);
  mapNexuses(model, map);
  mapAssimilators(model, map);
}

function mapGrid(model, map) {
  const node = model.add("Map");

  for (const key in map.grid) {
    node.set(key, map.grid[key]);
  }
}

function mapBases(model, map) {
  const memory = model.memory;
  const bases = [];

  const baseGoals = memory.pattern({
    nodes: { GOAL: { goal: true, isProducer: true, location: false }, BASE: { label: "base", isUnitType: true } },
    paths: [ [ "GOAL", "produce", "BASE" ] ],
    infos: [ { node: "GOAL" } ]
  });

  baseGoals.listen(function() {
    for (const match of baseGoals) {
      const goal = match.node("GOAL");
      const location = selectNewBase(model, map);

      if (location) {
        goal.set("location", location);
      } else {
        baseGoals.remove(baseGoals);
        return;
      }
    }
  });

  const pylons = memory.pattern({ nodes: { PYLON: { "type:pylon": true } }, infos: [ { node: "PYLON" } ] });

  pylons.listen(function() {
    for (const match of pylons) {
      const pylon = match.node("PYLON");

      if (isBase(map, pylon.get("x"), pylon.get("y"))) {
        pylon.set("type:base", true);

        const index = bases.indexOf(pylon);
        if (index < 0) {
          bases.push(pylon);
        }
      }
    }
  });

  const buildingGoals = memory.pattern({
    nodes: { GOAL: { goal: true, isProducer: true, location: false }, BUILDING: { isBuildingType: true } },
    paths: [ [ "GOAL", "produce", "BUILDING" ] ],
    infos: [ { node: "GOAL" } ]
  });

  buildingGoals.listen(function() {
    for (const match of buildingGoals) {
      const goal = match.node("GOAL");
      const buildingType = match.node("BUILDING").label;

      if (buildingType === "nexus") continue;
      if (buildingType === "base") continue;
      if (buildingType === "assimilator") continue;

      let location;

      for (const base of bases) {
        const x = base.get("x");
        const y = base.get("y");

        if (buildingType === "pylon") {
          if (!memory.one({ x: x + 2, y: y })) {
            location = model.add(base.label + "-P1").set("x", x + 2).set("y", y);
            break;
          }
          if (!memory.one({ x: x, y: y + 2 })) {
            location = model.add(base.label + "-P2").set("x", x).set("y", y + 2);
            break;
          }
          if (!memory.one({ x: x + 2, y: y + 2 })) {
            location = model.add(base.label + "-P3").set("x", x + 2).set("y", y + 2);
            break;
          }
        } else {
          if (!memory.one({ x: x - 2.5, y: y - 2.5 })) {
            location = model.add(base.label + "-B1").set("x", x - 2.5).set("y", y - 2.5);
            break;
          }
          if (!memory.one({ x: x - 2.5, y: y + 0.5 })) {
            location = model.add(base.label + "-B2").set("x", x - 2.5).set("y", y + 0.5);
            break;
          }
          if (!memory.one({ x: x + 0.5, y: y - 2.5 })) {
            location = model.add(base.label + "-B3").set("x", x + 0.5).set("y", y - 2.5);
            break;
          }
        }
      }
      if (location) {
        location.set("isLocation", true);
        goal.set("location", location);
      } else {
        memory.remove(goal);
      }
    }
  });
}

function sortBasesByDistanceToNexus(map, nexusX, nexusY) {
  for (const base of map.bases) base.distanceToNexus = Math.sqrt((base.x - nexusX) * (base.x - nexusX) + (base.y - nexusY) * (base.y - nexusY));
  map.bases.sort((a, b) => (a.distanceToNexus - b.distanceToNexus));
  map.areBasesSorted = true;
}

function selectNewBase(model, map) {
  for (const base of map.bases) {
    const x = base.x + base.w / 2 + 1;
    const y = base.y + base.h / 2 + 1;

    if (!model.memory.one({ x: x, y: y })) {
      return model.add("Base-" + base.index).set("isLocation", true).set("x", x).set("y", y);
    }
  }
}

function isBase(map, pylonX, pylonY) {
  for (const base of map.bases) {
    const x = base.x + base.w / 2 + 1;
    const y = base.y + base.h / 2 + 1;

    if ((x === pylonX) && (y === pylonY)) {
      return true;
    }
  }
}

function mapNexuses(model, map) {
  const nexusGoals = model.memory.pattern({
    nodes: { GOAL: { goal: true, isProducer: true, location: false }, NEXUS: { label: "nexus", isUnitType: true } },
    paths: [ [ "GOAL", "produce", "NEXUS" ] ],
    infos: [ { node: "GOAL" } ]
  });

  nexusGoals.listen(function() {
    for (const match of nexusGoals) {
      const goal = match.node("GOAL");
      const location = selectNewNexusLocation(model, map);

      if (location) {
        goal.set("location", location);
      } else {
        nexusGoals.remove(nexusGoals);
        return;
      }
    }
  });

  const pattern = model.memory.pattern({ nodes: { NEXUS: { "type:nexus": true, "operational": true } }, infos: [ { node: "NEXUS" } ] });

  pattern.listen(function() {
    for (const match of pattern) {
      const nexus = match.node("NEXUS");
      const cluster = findCluster(map, nexus.get("x"), nexus.get("y"));
      const ok = mapClusterResources(model, cluster);

      if (ok) {
        nexus.set("set-rally-point", model.add("Cluster-" + cluster.index));

        if (!map.areBasesSorted) {
          sortBasesByDistanceToNexus(map, cluster.x, cluster.y);
          sortNexusLocationsByDistanceToNexus(map, cluster.x, cluster.y);
          mapClusters(model, map);
          mapHarvest(model, nexus, cluster);
        }
      } else {
        nexus.set("operational", false);
      }
    }
  });
}

function sortNexusLocationsByDistanceToNexus(map, nexusX, nexusY) {
  for (const cluster of map.clusters) cluster.distanceToNexus = Math.sqrt((cluster.x - nexusX) * (cluster.x - nexusX) + (cluster.y - nexusY) * (cluster.y - nexusY));
  map.clusters.sort((a, b) => (a.distanceToNexus - b.distanceToNexus));
}

function selectNewNexusLocation(model, map) {
  for (const cluster of map.clusters) {
    if (!model.memory.one({ x: cluster.nexus.x, y: cluster.nexus.y })) {
      return model.add("Nexus-" + cluster.index).set("isLocation", true).set("x", cluster.nexus.x).set("y", cluster.nexus.y);
    }
  }
}

function mapClusters(model, map) {
  for (const cluster of map.clusters) {
    if (cluster.nexus) {
      model.add("Cluster-" + cluster.index).set("type", model.add("resources"))
        .set("x", cluster.x) .set("y", cluster.y).set("distanceToNexus", cluster.distanceToNexus)
        .set("nexusX", cluster.nexus.x) .set("nexusY", cluster.nexus.y);
    }
  }
}

function mapAssimilators(model, map) {
  const goals = model.memory.pattern({
    nodes: { GOAL: { goal: true, isProducer: true, location: false }, ASSIMILATOR: { label: "assimilator", isUnitType: true } },
    paths: [ [ "GOAL", "produce", "ASSIMILATOR" ] ],
    infos: [ { node: "GOAL" } ]
  });

  goals.listen(function() {
    for (const match of goals) {
      const goal = match.node("GOAL");
      const location = selectVespene(model);

      if (location) {
        goal.set("location", location);
      }
    }
  });

  const pattern = model.memory.pattern({ nodes: { ASSIMILATOR: { "type:assimilator": true } }, infos: [ { node: "ASSIMILATOR" } ] });

  pattern.listen(function() {
    for (const match of pattern) {
      const assimilator = match.node("ASSIMILATOR");
      const assimilatorX = assimilator.get("x");
      const assimilatorY = assimilator.get("y");

      for (const cluster of map.clusters) {
        if (cluster.nexus) {
          for (const resource of cluster.resources) {
            if ((Math.abs(resource.x - assimilatorX) <= 1) && (Math.abs(resource.y - assimilatorY) <= 1)) {
              const resourceImage = model.add(resource.tag);
              assimilator.set("resources", resourceImage);
              resourceImage.set("harvested", true);
              return;
            }
          }
        }
      }
    }
  });
}

function selectVespene(model) {
  for (const vespene of model.memory.all({ type: "vespene", "harvested": false })) {
    if (!model.memory.one({ "type:assimilator": true, x: vespene.get("x"), y: vespene.get("y") })) {
      return vespene;
    }
  }
}

function findCluster(map, x, y) {
  for (const cluster of map.clusters) {
    if (cluster.nexus && (cluster.nexus.x === x) && (cluster.nexus.y === y)) {
      return cluster;
    }
  }
}
