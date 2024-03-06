import Mission from "../mission.js";
import { WORKERS } from "../units.js";

// TODO: Make sure that the builder is not an agent of another mission! Use worker<memory>-><mission> for this. Allow worker to stop harvesting to take a mission.
// TODO: Calculate time to new supply from nexuses and pylons in progress of building. Calculate time to supply cap looking at production facilities and ordered units. Build pylons just in time.

export default class EnsureSupplyMission extends Mission {

  builderTag = null;

  constructor(map) {
    super();

    this.map = map;

    this.bases = [];
    
    for (const base of map.bases.sort((a, b) => (a.squareDistanceToHomeBase - b.squareDistanceToHomeBase))) {
      this.bases.push({ x: base.centerX + 2, y: base.centerY    , isFree: true });
      this.bases.push({ x: base.centerX    , y: base.centerY + 2, isFree: true });
    }
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

    if (observation.playerCommon.foodCap >= 200) return;
    if (observation.playerCommon.foodUsed < observation.playerCommon.foodCap - 8) return;
    if (observation.playerCommon.minerals < 100) return;
    if (isPylonBuilding(units)) return;
    if (isPylonOrdered(units)) return;

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
