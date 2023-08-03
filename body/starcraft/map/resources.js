
export function mapResources(model, map, homebase) {
  for (const base of map.bases) setCenterAndDistance(base, homebase);

  mapGrid(model, map);
  mapBases(model, map);
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

      if (buildingType === "base") continue;

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

function selectNewBase(model, map) {
  let closestBase;
  let closestDistance = Infinity;

  for (const base of map.bases) {
    if (model.memory.one({ x: base.centerX, y: base.centerY })) continue;
    if (!closestBase || (base.squareDistanceToHomeBase < closestDistance)) {
      closestBase = base;
      closestDistance = base.squareDistanceToHomeBase;
    }
  }

  if (closestBase) {
    return model.add("Base-" + closestBase.index).set("isLocation", true).set("x", closestBase.centerX).set("y", closestBase.centerY);
  }
}

function isBase(map, pylonX, pylonY) {
  for (const base of map.bases) {
    if ((base.centerX === pylonX) && (base.centerY === pylonY)) {
      return true;
    }
  }
}

function setCenterAndDistance(base, homebase) {
  const x = base.x + base.w / 2 + 1;
  const y = base.y + base.h / 2 + 1;

  base.centerX = x;
  base.centerY = y;
  base.squareDistanceToHomeBase = (homebase.x - x) * (homebase.x - x) + (homebase.y - y) * (homebase.y - y);
}
