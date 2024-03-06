import Mission from "../mission.js";
import { IS_MILITARY, WORKERS } from "../units.js";

// TODO: Make sure that the builder is not an agent of another mission! Use worker<memory>-><mission> for this. Allow worker to stop harvesting to take a mission.
// TODO: Rebuild destroyed pylons

export default class PowerBuildingsMission extends Mission {

  builderTag = null;

  constructor(map) {
    super();

    this.map = map;
    this.bases = map.bases.sort((a, b) => (a.squareDistanceToHomeBase - b.squareDistanceToHomeBase)).map(base => ({ x: base.centerX, y: base.centerY, isFree: true }));
  }

  run(commands, model, units) {
    if (this.builderTag) {
      const builder = findBuilder(units, model, this.builderTag);

      if (builder) {
        if (builder.orders.length && (builder.orders[0].abilityId === 881)) {
          return setBusy(builder, model, true);
        } else {
          setBusy(builder, model, false);
          this.builderTag = null;

          console.log("free builder:", builder.tag);
        }
      }
    }

    const observation = model.observation;

    if (observation.playerCommon.minerals < 100) return;
    if (isPylonBuilding(units)) return;
    if (isPylonOrdered(units)) return;

    const buildings = countBuildings(units);
    const pylons = countPowerPylons(this.bases);

    if (buildings + 1 < pylons * 3) return;

    const builder = findBuilder(units, model);
    if (!builder) return;

    const pos = findPlaceForPylon(this, units);

    if (createPylonCommand(commands, builder, pos)) {
      observation.playerCommon.minerals -= 100;
    }

    setBusy(builder, model, true);
    this.builderTag = builder.tag;
  }

}

function isPylonBuilding(units) {
  for (const [_, unit] of units) {
    if ((unit.unitType === 60) && (unit.buildProgress < 1)) {
      return true;
    }
  }
}

function isPylonOrdered(units) {
  for (const [_, unit] of units) {
    if (unit.unitType !== 84) continue;

    if (unit.orders.length && (unit.orders[0].abilityId === 881)) {
      return true;
    }
  }
}

function countBuildings(units) {
  let count = 0;

  for (const [_, unit] of units) {
    if ((unit.unitType !== 59) && (unit.unitType !== 60) && (unit.unitType !== 61) && (unit.unitType !== 84) && !IS_MILITARY[unit.unitType]) {
      count++;
    }
  }

  return count;
}

function countPowerPylons(bases) {
  let count = 0;

  for (const base of bases) {
    if (!base.isFree) {
      count++;
    }
  }

  return count;
}

function findBuilder(units, model, tag) {
  for (const [_, unit] of units) {
    // BuffIds=[274] means the probe is carrying vespene
    if (WORKERS[unit.unitType] && (!tag || (unit.tag === tag)) && !unit.buffIds.length && !isBusy(unit, model)) {
      return unit;
    }
  }
}

function findPlaceForPylon(mission, units) {
  const pylons = [];

  for (const [_, unit] of units) {
    if (unit.unitType === 60) {
      pylons.push(unit);
    }
  }

  for (const base of mission.bases) {
    if (base.isFree) {
      if (isPositionTaken(base, pylons)) {
        base.isFree = false;
        continue;
      }

      return base;
    }
  }
}

function isBusy(builder, model) {
  const image = model.get(builder.tag);

  return image ? !!image.get("isWorker") : false;
}

function setBusy(builder, model, isBusy) {
  const image = model.get(builder.tag);

  if (image) {
    image.set("isWorker", isBusy);
  }

  builder.isBusy = isBusy;
}

function createPylonCommand(commands, builder, pos) {
  if (!builder || !pos) return;

  const order = builder.orders.length ? builder.orders[0] : { abilityId: 0 };

  if ((order.abilityId !== 881) || !order.targetWorldSpacePos || !isSamePosition(order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [builder.tag], abilityId: 881, targetWorldSpacePos: pos, queueCommand: false });

    console.log("command builder", builder.tag, "to build pylon at", pos);
    return true;
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isPositionTaken(a, units) {
  for (const unit of units) {
    if (isSamePosition(a, unit.pos)) {
      return true;
    }
  }

  return false;
}
