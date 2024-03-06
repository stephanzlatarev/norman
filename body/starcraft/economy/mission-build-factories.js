import Mission from "../mission.js";
import { IS_MILITARY, WORKERS } from "../units.js";

// TODO: Make sure that the builder is not an agent of another mission! Use worker<memory>-><mission> for this. Allow worker to stop harvesting to take a mission.

const FACTORY = {
  883: "Gateway",
  884: "Stargate",
  893: "Robotics",
};

const ABILITY_ID = {
  Gateway: 883,
  Stargate: 884,
  Robotics: 893,
};

const MINERALS = {
  Gateway: 150,
  Stargate: 150,
  Robotics: 150,
};

const VESPENE = {
  Gateway: 0,
  Stargate: 150,
  Robotics: 100,
};

export default class BuildFactoriesMission extends Mission {

  builderTag = null;

  constructor(map) {
    super();

    this.map = map;

    this.bases = [];
    
    for (const base of map.bases.sort((a, b) => (a.squareDistanceToHomeBase - b.squareDistanceToHomeBase))) {
      this.bases.push({ x: base.centerX - 2.5, y: base.centerY - 2.5, isFree: true });
      this.bases.push({ x: base.centerX - 2.5, y: base.centerY + 0.5, isFree: true });
      this.bases.push({ x: base.centerX + 0.5, y: base.centerY - 2.5, isFree: true });
    }
  }

  run(commands, model, units) {
    if (this.builderTag) {
      const builder = findBuilder(units, model, this.builderTag);

      if (builder) {
        if (builder.orders.length && FACTORY[builder.orders[0].abilityId]) {
          return setBusy(builder, model, true);
        } else {
          setBusy(builder, model, false);
          this.builderTag = null;

          console.log("free builder:", builder.tag);
        }
      }
    }

    const observation = model.observation;

    const factory = selectFactoryType();
    if (!factory) return;

    if (observation.playerCommon.minerals < MINERALS[factory]) return;
    if (observation.playerCommon.vespene < VESPENE[factory]) return;

    const builder = findBuilder(units, model);
    if (!builder) return;

    const pos = findPlaceForBuilding(this, units);
    if (!pos) return;

    if (createBuildingCommand(commands, builder, factory, pos)) {
      observation.playerCommon.minerals -= MINERALS[factory];
      observation.playerCommon.vespene -= VESPENE[factory];
    }

    setBusy(builder, model, true);
    this.builderTag = builder.tag;
  }

}

function selectFactoryType() {
  return "Gateway";
}

function findBuilder(units, model, tag) {
  for (const [_, unit] of units) {
    // BuffIds=[274] means the probe is carrying vespene
    if (WORKERS[unit.unitType] && (!tag || (unit.tag === tag)) && !unit.buffIds.length && !isBusy(unit, model)) {
      return unit;
    }
  }
}

function findPlaceForBuilding(mission, units) {
  const buildings = [];
  const pylons = [];

  for (const [_, unit] of units) {
    if ((unit.unitType === 60) && (unit.buildProgress >= 1)) {
      pylons.push(unit);
    }
    if ((unit.unitType !== 59) && (unit.unitType !== 60) && (unit.unitType !== 61) && (unit.unitType !== 84) && !IS_MILITARY[unit.unitType]) {
      buildings.push(unit);
    }
  }

  for (const base of mission.bases) {
    if (base.isFree) {
      if (isPositionTaken(base, buildings)) {
        base.isFree = false;
        continue;
      }
      if (!isPoweredBy(base, pylons)) {
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

function createBuildingCommand(commands, builder, factory, pos) {
  if (!builder || !factory || !pos) return;

  const order = builder.orders.length ? builder.orders[0] : { abilityId: 0 };

  if ((order.abilityId !== ABILITY_ID[factory]) || !order.targetWorldSpacePos || !isSamePosition(order.targetWorldSpacePos, pos)) {
    commands.push({ unitTags: [builder.tag], abilityId: ABILITY_ID[factory], targetWorldSpacePos: pos, queueCommand: false });

    console.log("command builder", builder.tag, "to build", factory, "at", pos);
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

function isWithinPowerDistance(a, b) {
  return (Math.abs(a.x - b.x) < 5) && (Math.abs(a.y - b.y) < 5);
}

function isPoweredBy(a, pylons) {
  for (const pylon of pylons) {
    if (isWithinPowerDistance(a, pylon.pos)) {
      console.log("plot", a, "is powered by", pylon.pos);
      return true;
    }
  }

  return false;
}
